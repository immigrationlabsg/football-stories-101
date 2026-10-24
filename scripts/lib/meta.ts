/**
 * Posting to Facebook, Instagram and Threads through Meta's official APIs.
 * Credentials come from environment variables (GitHub secrets):
 *
 *   META_PAGE_ID, META_PAGE_ACCESS_TOKEN   Facebook Page (the token never expires if it was made from a long-lived user token)
 *   META_IG_USER_ID                        Instagram professional account ID
 *   INSTAGRAM_ACCESS_TOKEN                 (optional, preferred) token from "Instagram API with Instagram login": needs no Facebook Page link.
 *                                          Without it, Instagram posts through the Page token (the account must be linked to the Page).
 *   THREADS_USER_ID, THREADS_ACCESS_TOKEN  Threads (the token lasts 60 days and needs refreshing)
 *
 * Instagram and Facebook fetch pictures themselves, so every image must be a public https URL.
 */
const GRAPH = 'https://graph.facebook.com/v21.0';
const THREADS = 'https://graph.threads.net/v1.0';
const INSTAGRAM = 'https://graph.instagram.com/v21.0';

export interface MetaConfig {
  facebook: boolean;
  instagram: boolean;
  threads: boolean;
}

export function metaConfigured(env: NodeJS.ProcessEnv = process.env): MetaConfig {
  const has = (...k: string[]) => k.every((x) => Boolean(env[x]?.trim()));
  return {
    facebook: has('META_PAGE_ID', 'META_PAGE_ACCESS_TOKEN'),
    instagram: Boolean(env.META_IG_USER_ID?.trim() && (env.INSTAGRAM_ACCESS_TOKEN?.trim() || env.META_PAGE_ACCESS_TOKEN?.trim())),
    threads: has('THREADS_ACCESS_TOKEN'), // the user ID is optional: 'me' works with the token alone
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call(url: string, params: Record<string, string | boolean>, method: 'POST' | 'GET' = 'POST'): Promise<any> {
  const body = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(method === 'GET' ? `${url}?${body}` : url, method === 'GET' ? undefined : { method, body });
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || json.error) {
    const e = json.error ?? {};
    throw new Error(`${url.replace(/\/\d+\//, '/ID/')} responded ${res.status}: ${e.message ?? 'unknown error'}${e.code ? ` (code ${e.code})` : ''}`);
  }
  return json;
}

/** The picture must be live before Meta can fetch it; the site may still be deploying. */
export async function waitForUrl(url: string, attempts = 18, delayMs = 10_000): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return;
    } catch {
      /* try again */
    }
    await sleep(delayMs);
  }
  throw new Error(`${url} is not reachable yet`);
}

/**
 * A photo post on the Page with the full text as its message.
 * With draft: true the post is saved as a DRAFT, which shows in Meta Business Suite
 * (Planner or Posts) and in the Pages app, and nothing is published.
 */
export async function postFacebookPhoto(a: { imageUrl: string; message: string; draft?: boolean; scheduleAt?: Date }, env = process.env): Promise<string> {
  const token = env.META_PAGE_ACCESS_TOKEN!;
  if (a.scheduleAt) {
    // A scheduled post shows in Business Suite (phone and computer) under Content and in the Planner, and publishes itself at that time.
    const photo = await call(`${GRAPH}/${env.META_PAGE_ID}/photos`, { url: a.imageUrl, published: false, access_token: token });
    const post = await call(`${GRAPH}/${env.META_PAGE_ID}/feed`, {
      message: a.message,
      attached_media: JSON.stringify([{ media_fbid: photo.id }]),
      published: false,
      scheduled_publish_time: Math.floor(a.scheduleAt.getTime() / 1000),
      access_token: token,
    });
    return String(post.id);
  }
  if (!a.draft) {
    const j = await call(`${GRAPH}/${env.META_PAGE_ID}/photos`, { url: a.imageUrl, message: a.message, published: true, access_token: token });
    return String(j.post_id ?? j.id);
  }
  const photo = await call(`${GRAPH}/${env.META_PAGE_ID}/photos`, { url: a.imageUrl, published: false, access_token: token });
  const post = await call(`${GRAPH}/${env.META_PAGE_ID}/feed`, {
    message: a.message,
    attached_media: JSON.stringify([{ media_fbid: photo.id }]),
    published: false,
    unpublished_content_type: 'DRAFT',
    access_token: token,
  });
  return String(post.id);
}

/** An Instagram carousel (2 to 10 images). */
export async function postInstagramCarousel(a: { imageUrls: string[]; caption: string }, env = process.env): Promise<string> {
  const ig = env.META_IG_USER_ID;
  // Instagram login token (graph.instagram.com) when we have one, otherwise the Facebook Page token.
  const direct = Boolean(env.INSTAGRAM_ACCESS_TOKEN?.trim());
  const base = direct ? INSTAGRAM : GRAPH;
  const token = (direct ? env.INSTAGRAM_ACCESS_TOKEN : env.META_PAGE_ACCESS_TOKEN)!;
  if (a.imageUrls.length < 2 || a.imageUrls.length > 10) throw new Error(`Instagram carousels need 2 to 10 images, got ${a.imageUrls.length}`);
  const children: string[] = [];
  for (const image_url of a.imageUrls) {
    const c = await call(`${base}/${ig}/media`, { image_url, is_carousel_item: true, access_token: token });
    children.push(c.id);
  }
  const parent = await call(`${base}/${ig}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: a.caption, access_token: token });
  for (let i = 0; i < 20; i++) {
    const s = await call(`${base}/${parent.id}`, { fields: 'status_code', access_token: token }, 'GET');
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram carousel container ${s.status_code}`);
    await sleep(3000);
  }
  const published = await call(`${base}/${ig}/media_publish`, { creation_id: parent.id, access_token: token });
  return String(published.id);
}

/** A Threads post: the carousel cards with the teaser text (or text only), and an optional reply. */
export async function postThreads(a: { text: string; reply?: string; imageUrls?: string[]; videoUrl?: string }, env = process.env): Promise<string> {
  const user = env.THREADS_USER_ID?.trim() || 'me';
  const token = env.THREADS_ACCESS_TOKEN!;
  const ready = async (id: string, tries = 20) => {
    for (let i = 0; i < tries; i++) {
      const s = await call(`${THREADS}/${id}`, { fields: 'status', access_token: token }, 'GET');
      if (s.status === 'FINISHED') return;
      if (s.status === 'ERROR' || s.status === 'EXPIRED') throw new Error(`Threads container ${s.status}`);
      await sleep(3000);
    }
    throw new Error(`Threads container ${id} was not ready after ${tries * 3} seconds`);
  };
  const publish = async (params: Record<string, string>) => {
    const c = await call(`${THREADS}/${user}/threads`, { ...params, access_token: token });
    await sleep(5000); // Threads asks for a short wait between creating and publishing
    await ready(c.id, params.media_type === 'VIDEO' ? 100 : 20); // a video takes a few minutes to process
    const p = await call(`${THREADS}/${user}/threads_publish`, { creation_id: c.id, access_token: token });
    return String(p.id);
  };
  let id: string;
  if (a.videoUrl) {
    id = await publish({ media_type: 'VIDEO', video_url: a.videoUrl, text: a.text });
  } else if (a.imageUrls && a.imageUrls.length >= 2) {
    // The same cards as the Instagram carousel, with the post text above them.
    const children: string[] = [];
    for (const image_url of a.imageUrls) {
      const c = await call(`${THREADS}/${user}/threads`, { media_type: 'IMAGE', image_url, is_carousel_item: true, access_token: token });
      children.push(c.id);
    }
    for (const c of children) await ready(c);
    id = await publish({ media_type: 'CAROUSEL', children: children.join(','), text: a.text });
  } else {
    id = await publish({ media_type: 'TEXT', text: a.text });
  }
  if (a.reply) await publish({ media_type: 'TEXT', text: a.reply, reply_to_id: id });
  return id;
}

/** An Instagram Reel (also shown in the profile grid). Returns the published media id. */
export async function postInstagramReel(a: { videoUrl: string; caption: string }, env = process.env): Promise<string> {
  const ig = env.META_IG_USER_ID;
  const direct = Boolean(env.INSTAGRAM_ACCESS_TOKEN?.trim());
  const base = direct ? INSTAGRAM : GRAPH;
  const token = (direct ? env.INSTAGRAM_ACCESS_TOKEN : env.META_PAGE_ACCESS_TOKEN)!;
  const c = await call(`${base}/${ig}/media`, { media_type: 'REELS', video_url: a.videoUrl, caption: a.caption, share_to_feed: true, access_token: token });
  let finished = false;
  for (let i = 0; i < 100 && !finished; i++) {
    // Instagram downloads and processes the video first; this usually takes under a minute.
    await sleep(3000);
    const s = await call(`${base}/${c.id}`, { fields: 'status_code,status', access_token: token }, 'GET');
    if (s.status_code === 'FINISHED') finished = true;
    else if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram Reel container ${s.status_code}: ${s.status ?? ''}`);
  }
  if (!finished) throw new Error('Instagram Reel was not processed after 5 minutes; nothing was published');
  const published = await call(`${base}/${ig}/media_publish`, { creation_id: c.id, access_token: token });
  return String(published.id);
}

/** Meta accepted a Facebook Reel (it may still publish) but never confirmed it was processed and scheduled. */
export class UnconfirmedReel extends Error {
  constructor(public videoId: string, message: string) {
    super(message);
  }
}

/**
 * A Facebook Reel on the Page, published now or scheduled (it then shows in Business Suite's Planner).
 * Meta fetches the video from its public URL. Returns the video id.
 */
export async function postFacebookReel(a: { videoUrl: string; description: string; scheduleAt?: Date }, env = process.env): Promise<string> {
  const token = env.META_PAGE_ACCESS_TOKEN!;
  const page = env.META_PAGE_ID;
  const start = await call(`${GRAPH}/${page}/video_reels`, { upload_phase: 'start', access_token: token });
  const up = await fetch(`https://rupload.facebook.com/video-upload/v21.0/${start.video_id}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}`, file_url: a.videoUrl },
  });
  const uj = (await up.json().catch(() => ({}))) as any;
  if (!up.ok || !uj.success) throw new Error(`Facebook Reel upload responded ${up.status}: ${uj.error?.message ?? uj.debug_info?.message ?? 'unknown error'}`);
  try {
    await call(`${GRAPH}/${page}/video_reels`, {
      upload_phase: 'finish',
      video_id: start.video_id,
      description: a.description,
      ...(a.scheduleAt
        ? { video_state: 'SCHEDULED', scheduled_publish_time: String(Math.floor(a.scheduleAt.getTime() / 1000)) }
        : { video_state: 'PUBLISHED' }),
      access_token: token,
    });
  } catch (e) {
    // Meta may have applied the finish even though the answer was an error: unless the video is plainly in error,
    // treat it as a Reel Meta may hold, so it is recorded and never uploaded twice.
    let st: any = null;
    try {
      st = (await call(`${GRAPH}/${start.video_id}`, { fields: 'status', access_token: token }, 'GET')).status ?? null;
    } catch {
      st = null;
    }
    const plainlyFailed = st && (st.video_status === 'error' || [st.uploading_phase?.status, st.processing_phase?.status, st.publishing_phase?.status].includes('error'));
    if (plainlyFailed) throw e;
    throw new UnconfirmedReel(String(start.video_id), `the finish call failed (${(e as Error).message}) but Meta may hold the Reel`);
  }
  // Wait until Meta has fetched and processed the video, so a caller never removes the post it replaces too early.
  // From here on Meta holds the Reel, so every failure is an UnconfirmedReel carrying its id: it must never be forgotten.
  const id = String(start.video_id);
  let last = '';
  try {
    for (let i = 0; i < 100; i++) {
      const v = await call(`${GRAPH}/${id}`, { fields: 'status', access_token: token }, 'GET');
      const st = v.status ?? {};
      last = JSON.stringify(st).slice(0, 300);
      const phases = [st.uploading_phase?.status, st.processing_phase?.status, st.publishing_phase?.status];
      if (st.video_status === 'error' || phases.includes('error')) throw new UnconfirmedReel(id, `Facebook could not process the Reel (video ${id}): ${last}`);
      if (st.processing_phase?.status === 'complete' && (a.scheduleAt ? st.publishing_phase?.publish_status === 'scheduled' || st.publishing_phase?.status === 'complete' : true)) {
        return id;
      }
      await sleep(3000);
    }
  } catch (e) {
    if (e instanceof UnconfirmedReel) throw e;
    throw new UnconfirmedReel(id, `checking Facebook Reel ${id} failed: ${(e as Error).message}`);
  }
  throw new UnconfirmedReel(id, `Facebook Reel ${id} was not confirmed after 5 minutes (last status ${last})`);
}

/** Deletes a Facebook post or video on the Page (used when a scheduled picture post is replaced by a Reel). */
export async function deleteFacebookObject(id: string, env = process.env): Promise<void> {
  const r = await fetch(`${GRAPH}/${id}?access_token=${env.META_PAGE_ACCESS_TOKEN}`, { method: 'DELETE' });
  const j = (await r.json().catch(() => ({}))) as any;
  if (!r.ok || j.error || j.success === false) throw new Error(`deleting ${id} responded ${r.status}: ${j.error?.message ?? 'unknown error'}${j.error?.code ? ` (code ${j.error.code})` : ''}`);
}
