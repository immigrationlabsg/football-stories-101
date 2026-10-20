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

/** A Threads post with the link as a reply to it. */
export async function postThreads(a: { text: string; reply?: string; imageUrls?: string[] }, env = process.env): Promise<string> {
  const user = env.THREADS_USER_ID?.trim() || 'me';
  const token = env.THREADS_ACCESS_TOKEN!;
  const ready = async (id: string) => {
    for (let i = 0; i < 20; i++) {
      const s = await call(`${THREADS}/${id}`, { fields: 'status', access_token: token }, 'GET');
      if (s.status === 'FINISHED') return;
      if (s.status === 'ERROR' || s.status === 'EXPIRED') throw new Error(`Threads container ${s.status}`);
      await sleep(3000);
    }
  };
  const publish = async (params: Record<string, string>) => {
    const c = await call(`${THREADS}/${user}/threads`, { ...params, access_token: token });
    await sleep(5000); // Threads asks for a short wait between creating and publishing
    await ready(c.id);
    const p = await call(`${THREADS}/${user}/threads_publish`, { creation_id: c.id, access_token: token });
    return String(p.id);
  };
  let id: string;
  if (a.imageUrls && a.imageUrls.length >= 2) {
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
