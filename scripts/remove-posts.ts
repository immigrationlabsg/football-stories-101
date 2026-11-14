/**
 * Removes published posts (workflow "Remove posts"), e.g. when an old cut of a Reel went out and must be replaced.
 * The owner asks for each removal in chat; this only runs by hand (workflow_dispatch). Keys are repo secrets, never printed.
 *
 *   TARGETS="facebook:123 instagram:456 threads:789 youtube:<zernio post id>" npm run remove-posts             dry run: checks each post exists
 *   TARGETS="..." DRY_RUN=0 npm run remove-posts                                                              deletes them
 *
 * facebook  - Graph API DELETE on the post or video id (Page token)
 * instagram - Graph API DELETE on the media id (Instagram token, or the Page token when there is none)
 * threads   - Threads API DELETE on the thread id; our own replies under it are deleted first
 * youtube   - Zernio POST /posts/{id}/unpublish (Zernio cannot remove TikTok or Instagram posts)
 */
const GRAPH = 'https://graph.facebook.com/v21.0';
const INSTAGRAM = 'https://graph.instagram.com/v21.0';
const THREADS = 'https://graph.threads.net/v1.0';
const ZERNIO = 'https://zernio.com/api/v1';
const env = process.env;
const dryRun = env.DRY_RUN !== '0';
const RAW = env.ZERNIO_API_KEY?.trim();
const ZKEY = RAW?.match(/sk_[0-9a-f]{64}/)?.[0] ?? RAW;

async function json(r: Response) {
  return (await r.json().catch(() => ({}))) as any;
}
function fail(what: string, r: Response, j: any): never {
  throw new Error(`${what} responded ${r.status}: ${j.error?.message ?? j.message ?? j.error ?? 'unknown error'}${j.error?.code ? ` (code ${j.error.code})` : ''}`);
}

async function graphDelete(base: string, id: string, token: string, label: string) {
  const g = await fetch(`${base}/${id}?fields=id&access_token=${token}`);
  const gj = await json(g);
  if (!g.ok || gj.error) fail(`${label} ${id}: looking it up`, g, gj);
  console.log(`${label} ${id}: found.`);
  if (dryRun) return;
  const r = await fetch(`${base}/${id}?access_token=${token}`, { method: 'DELETE' });
  const j = await json(r);
  if (!r.ok || j.error || j.success === false) fail(`${label} ${id}: deleting`, r, j);
  console.log(`${label} ${id}: deleted.`);
}

async function threadsDelete(id: string) {
  const token = env.THREADS_ACCESS_TOKEN!;
  const me = await json(await fetch(`${THREADS}/me?fields=id,username&access_token=${token}`));
  const rep = await fetch(`${THREADS}/${id}/replies?fields=id,username&access_token=${token}`);
  const rj = await json(rep);
  const own = (rj.data ?? []).filter((x: any) => x.username && x.username === me.username).map((x: any) => x.id);
  console.log(`Threads ${id}: ${own.length} reply(ies) of ours under it.`);
  for (const r of own) await graphDelete(THREADS, r, token, 'Threads reply');
  await graphDelete(THREADS, id, token, 'Threads');
}

async function youtubeUnpublish(postId: string) {
  if (!ZKEY) throw new Error('ZERNIO_API_KEY is not set (repo secret).');
  const h = { Authorization: `Bearer ${ZKEY}`, 'Content-Type': 'application/json' };
  const g = await fetch(`${ZERNIO}/posts/${postId}`, { headers: h });
  const gj = await json(g);
  if (!g.ok) fail(`YouTube (Zernio post ${postId}): looking it up`, g, gj);
  const p = gj.post ?? gj;
  console.log(`YouTube (Zernio post ${postId}): status ${p.status}; platforms ${(p.platforms ?? []).map((x: any) => `${x.platform}:${x.status}`).join(', ')}.`);
  if (dryRun) return;
  const r = await fetch(`${ZERNIO}/posts/${postId}/unpublish`, { method: 'POST', headers: h, body: JSON.stringify({ platform: 'youtube' }) });
  const j = await json(r);
  if (!r.ok) fail(`YouTube (Zernio post ${postId}): unpublishing`, r, j);
  console.log(`YouTube (Zernio post ${postId}): removed from YouTube.`);
}

async function main() {
  const targets = (env.TARGETS ?? '').split(/\s+/).filter(Boolean);
  if (!targets.length) throw new Error('TARGETS is empty.');
  console.log(dryRun ? 'DRY RUN: checking only, nothing is deleted.' : 'Deleting for real.');
  let failed = 0;
  for (const t of targets) {
    const [net, id] = t.split(':');
    try {
      if (!id) throw new Error(`"${t}" is not network:id`);
      if (net === 'facebook') await graphDelete(GRAPH, id, env.META_PAGE_ACCESS_TOKEN!, 'Facebook');
      else if (net === 'instagram') {
        // Instagram-login token first; if that cannot delete, the Facebook-login route (Page token on graph.facebook.com).
        const direct = Boolean(env.INSTAGRAM_ACCESS_TOKEN?.trim());
        try {
          await graphDelete(direct ? INSTAGRAM : GRAPH, id, (direct ? env.INSTAGRAM_ACCESS_TOKEN : env.META_PAGE_ACCESS_TOKEN)!, 'Instagram');
        } catch (e) {
          if (!direct) throw e;
          console.log(`Instagram ${id}: Instagram token could not delete (${(e as Error).message.slice(0, 120)}); trying the Page token.`);
          await graphDelete(GRAPH, id, env.META_PAGE_ACCESS_TOKEN!, 'Instagram (Page token)');
        }
      } else if (net === 'threads') await threadsDelete(id);
      else if (net === 'youtube') await youtubeUnpublish(id);
      else throw new Error(`unknown network "${net}"`);
    } catch (e) {
      failed++;
      console.error(`FAILED ${t}: ${(e as Error).message}`);
    }
  }
  if (failed) process.exit(1);
}

main();
