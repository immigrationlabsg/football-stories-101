/**
 * Posting to Facebook, Instagram and Threads through Meta's official APIs.
 * Credentials come from environment variables (GitHub secrets):
 *
 *   META_PAGE_ID, META_PAGE_ACCESS_TOKEN   Facebook Page (the token never expires if it was made from a long-lived user token)
 *   META_IG_USER_ID                        Instagram professional account linked to that Page (uses the same page token)
 *   THREADS_USER_ID, THREADS_ACCESS_TOKEN  Threads (the token lasts 60 days and needs refreshing)
 *
 * Instagram and Facebook fetch pictures themselves, so every image must be a public https URL.
 */
const GRAPH = 'https://graph.facebook.com/v21.0';
const THREADS = 'https://graph.threads.net/v1.0';

export interface MetaConfig {
  facebook: boolean;
  instagram: boolean;
  threads: boolean;
}

export function metaConfigured(env: NodeJS.ProcessEnv = process.env): MetaConfig {
  const has = (...k: string[]) => k.every((x) => Boolean(env[x]?.trim()));
  return {
    facebook: has('META_PAGE_ID', 'META_PAGE_ACCESS_TOKEN'),
    instagram: has('META_IG_USER_ID', 'META_PAGE_ACCESS_TOKEN'),
    threads: has('THREADS_USER_ID', 'THREADS_ACCESS_TOKEN'),
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

/** A photo post on the Page with the full text as its message. */
export async function postFacebookPhoto(a: { imageUrl: string; message: string }, env = process.env): Promise<string> {
  const j = await call(`${GRAPH}/${env.META_PAGE_ID}/photos`, {
    url: a.imageUrl,
    message: a.message,
    published: true,
    access_token: env.META_PAGE_ACCESS_TOKEN!,
  });
  return String(j.post_id ?? j.id);
}

/** An Instagram carousel (2 to 10 images). */
export async function postInstagramCarousel(a: { imageUrls: string[]; caption: string }, env = process.env): Promise<string> {
  const ig = env.META_IG_USER_ID;
  const token = env.META_PAGE_ACCESS_TOKEN!;
  if (a.imageUrls.length < 2 || a.imageUrls.length > 10) throw new Error(`Instagram carousels need 2 to 10 images, got ${a.imageUrls.length}`);
  const children: string[] = [];
  for (const image_url of a.imageUrls) {
    const c = await call(`${GRAPH}/${ig}/media`, { image_url, is_carousel_item: true, access_token: token });
    children.push(c.id);
  }
  const parent = await call(`${GRAPH}/${ig}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: a.caption, access_token: token });
  for (let i = 0; i < 20; i++) {
    const s = await call(`${GRAPH}/${parent.id}`, { fields: 'status_code', access_token: token }, 'GET');
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram carousel container ${s.status_code}`);
    await sleep(3000);
  }
  const published = await call(`${GRAPH}/${ig}/media_publish`, { creation_id: parent.id, access_token: token });
  return String(published.id);
}

/** A Threads post with the link as a reply to it. */
export async function postThreads(a: { text: string; reply?: string }, env = process.env): Promise<string> {
  const user = env.THREADS_USER_ID;
  const token = env.THREADS_ACCESS_TOKEN!;
  const publish = async (params: Record<string, string>) => {
    const c = await call(`${THREADS}/${user}/threads`, { media_type: 'TEXT', ...params, access_token: token });
    await sleep(5000); // Threads asks for a short wait between creating and publishing
    const p = await call(`${THREADS}/${user}/threads_publish`, { creation_id: c.id, access_token: token });
    return String(p.id);
  };
  const id = await publish({ text: a.text });
  if (a.reply) await publish({ text: a.reply, reply_to_id: id });
  return id;
}
