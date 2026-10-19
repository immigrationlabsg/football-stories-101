/**
 * Asks Meta about one Facebook post or draft by its ID, so we can see whether it exists and whether it is published.
 *   npm run check-facebook -- 1419297047928388_122094755013522790
 */
const id = process.argv[2];
const del = process.argv[3] === '--delete';
const token = process.env.META_PAGE_ACCESS_TOKEN;
if (!id || !token) throw new Error('Usage: npm run check-facebook -- <post id>, with META_PAGE_ACCESS_TOKEN set');
if (del) {
  const r = await fetch(`https://graph.facebook.com/v21.0/${id}?access_token=${token}`, { method: 'DELETE' });
  const d = (await r.json()) as any;
  console.log(r.ok && d.success ? `DELETED ${id}` : `Meta says: ${d.error?.message ?? r.status}`);
  process.exit(r.ok && d.success ? 0 : 1);
}
const fields = 'id,is_published,created_time,scheduled_publish_time,status_type,message,attachments{media_type}';
const res = await fetch(`https://graph.facebook.com/v21.0/${id}?fields=${encodeURIComponent(fields)}&access_token=${token}`);
const j = (await res.json()) as any;
if (!res.ok || j.error) {
  console.log(`Meta says: ${j.error?.message ?? res.status} (code ${j.error?.code ?? '?'})`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ...j, message: j.message ? `${String(j.message).slice(0, 80)}…` : undefined }, null, 2));
  console.log(j.is_published === false ? 'RESULT: this is an unpublished post (a draft or scheduled post). It is NOT public.' : 'RESULT: this post is PUBLISHED.');
}
