/**
 * Asks Meta about one Facebook post or draft by its ID, so we can see whether it exists and whether it is published.
 *   npm run check-facebook -- 1419297047928388_122094755013522790
 * The word link: is an Instagram account connected to the Page? A Facebook Reel: reel:<video id>. An Instagram post: prefix its media id with ig:, e.g. ig:17939791962391542. The word threads checks the Threads key; threads:<id> reads (or with --delete deletes) a Threads post.
 */
const token = process.env.META_PAGE_ACCESS_TOKEN;
const id = process.argv[2];
if (id === 'list') {
  // What is on the Page: published posts, and unpublished (draft or scheduled) ones. IDs are printed without the Page prefix.
  const page = process.env.META_PAGE_ID;
  const show = async (label: string, path: string) => {
    const r = await fetch(`https://graph.facebook.com/v21.0/${page}/${path}&access_token=${token}`);
    const j = (await r.json()) as any;
    if (!r.ok || j.error) return console.log(`${label}: Meta says ${j.error?.message ?? r.status}`);
    console.log(`${label}: ${j.data.length}`);
    for (const p of j.data) console.log(`  ${String(p.id).split('_')[1] ?? p.id} | ${p.created_time} | ${p.is_published === false ? 'UNPUBLISHED' : 'PUBLISHED'} | ${String(p.message ?? '').slice(0, 50)}`);
  };
  await show('PUBLISHED on the Page', 'published_posts?fields=id,created_time,message,is_published&limit=10');
  await show('UNPUBLISHED (drafts and scheduled)', 'promotable_posts?is_published=false&fields=id,created_time,message,is_published&limit=10');
  await show('SCHEDULED', 'scheduled_posts?fields=id,created_time,message,is_published,scheduled_publish_time&limit=10');
  process.exit(0);
}
const del = process.argv[3] === '--delete';
if (id?.startsWith('threads:')) {
  // A Threads post, by its id: read it, or delete it with --delete (needs the threads_delete permission).
  const tid = id.slice(8);
  const url = `https://graph.threads.net/v1.0/${tid}?access_token=${process.env.THREADS_ACCESS_TOKEN}`;
  const r = del ? await fetch(url, { method: 'DELETE' }) : await fetch(`${url}&fields=id,media_type,text,permalink,timestamp`);
  const d = (await r.json()) as any;
  if (!r.ok || d.error) {
    console.log(`Meta says: ${d.error?.message ?? r.status} (code ${d.error?.code ?? '?'})`);
    process.exit(1);
  }
  console.log(del ? `DELETED Threads post ${tid}` : JSON.stringify({ ...d, text: d.text ? `${String(d.text).slice(0, 80)}…` : undefined }, null, 2));
  process.exit(0);
}
if (id === 'threads') {
  // Checks the Threads key: which account it belongs to. Changes nothing.
  const r = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${process.env.THREADS_ACCESS_TOKEN}`);
  const d = (await r.json()) as any;
  console.log(r.ok && !d.error ? `Threads key works for @${d.username} (user ID ${d.id})` : `Meta says: ${d.error?.message ?? r.status}`);
  process.exit(r.ok && !d.error ? 0 : 1);
}
if (id?.startsWith('ig:')) {
  // An Instagram post, by its media id, through the Instagram login token.
  const ig = process.env.INSTAGRAM_ACCESS_TOKEN;
  const media = id.slice(3);
  const url = `https://graph.instagram.com/v21.0/${media}?access_token=${ig}`;
  const r = del ? await fetch(url, { method: 'DELETE' }) : await fetch(`${url}&fields=id,caption,media_type,permalink,timestamp`);
  const d = (await r.json()) as any;
  if (!r.ok || d.error) {
    console.log(`Meta says: ${d.error?.message ?? r.status} (code ${d.error?.code ?? '?'})`);
    process.exit(1);
  }
  console.log(del ? `DELETED Instagram post ${media}` : JSON.stringify({ ...d, caption: d.caption ? `${String(d.caption).slice(0, 80)}…` : undefined }, null, 2));
  process.exit(0);
}
if (id === 'link') {
  // Is an Instagram account connected to the Page? (Needed for "Share to Facebook" and Meta's licensed music.)
  const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.META_PAGE_ID}?fields=name,instagram_business_account{id,username},connected_instagram_account{id,username}&access_token=${token}`);
  const d = (await r.json()) as any;
  if (!r.ok || d.error) {
    console.log(`Meta says: ${d.error?.message ?? r.status} (code ${d.error?.code ?? '?'})`);
    process.exit(1);
  }
  const ig = d.instagram_business_account ?? d.connected_instagram_account;
  console.log(ig ? `RESULT: LINKED. Page "${d.name}" is connected to Instagram @${ig.username ?? '?'} (${ig.id}).` : `RESULT: NOT LINKED. Page "${d.name}" has no Instagram account connected.`);
  process.exit(0);
}
if (id?.startsWith('reel:')) {
  // A Facebook Reel, by its video id: its processing and publishing status (or delete it with --delete).
  const vid = id.slice(5);
  const url = `https://graph.facebook.com/v21.0/${vid}?access_token=${token}`;
  const r = del ? await fetch(url, { method: 'DELETE' }) : await fetch(`${url}&fields=id,status,created_time,description`);
  const d = (await r.json()) as any;
  if (!r.ok || d.error) {
    console.log(`Meta says: ${d.error?.message ?? r.status} (code ${d.error?.code ?? '?'})`);
    process.exit(1);
  }
  console.log(del ? `DELETED Facebook Reel ${vid}` : JSON.stringify({ ...d, description: d.description ? `${String(d.description).slice(0, 80)}…` : undefined }, null, 2));
  process.exit(0);
}
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
