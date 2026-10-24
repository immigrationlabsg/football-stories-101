/**
 * Read-only audience report: followers, reach and per-post numbers from Facebook, Instagram and Threads.
 * Changes nothing. Each figure is asked for separately, so a missing permission shows as one line, not a failure.
 *   npm run insights
 */
const FB = 'https://graph.facebook.com/v21.0';
const IG = 'https://graph.instagram.com/v21.0';
const TH = 'https://graph.threads.net/v1.0';
const env = process.env;

async function get(base: string, path: string, token: string | undefined, params: Record<string, string> = {}): Promise<any> {
  if (!token) return { error: 'no key saved' };
  const q = new URLSearchParams({ ...params, access_token: token });
  let r: Response;
  try {
    r = await fetch(`${base}/${path}?${q}`);
  } catch {
    return { error: 'network error' }; // never print the error: it can contain the URL with the key
  }
  const j = (await r.json().catch(() => ({}))) as any;
  return !r.ok || j.error ? { error: `${j.error?.message ?? r.status}${j.error?.code ? ` (code ${j.error.code})` : ''}` } : j;
}
const out: string[] = [];
const say = (s = '') => out.push(s);
const sum = (vals?: { value: number }[]) => (vals ?? []).reduce((a, v) => a + (typeof v.value === 'number' ? v.value : 0), 0);
const short = (s?: string) => String(s ?? '').replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 45);
const day = (s?: string) => String(s ?? '?').slice(0, 10);
const since = String(Math.floor(Date.now() / 1000) - 28 * 86400);
const until = String(Math.floor(Date.now() / 1000));

// One metric per call; returns "n" or the reason it is unavailable.
async function metric(base: string, path: string, token: string | undefined, name: string, params: Record<string, string>) {
  const j = await get(base, path, token, { metric: name, ...params });
  if (j.error) return `n/a (${j.error})`;
  const d = j.data?.[0];
  if (!d) return 'n/a (no data)';
  if (d.total_value) return String(d.total_value.value ?? 'n/a');
  return String(d.values?.length > 1 ? sum(d.values) : d.values?.[0]?.value ?? '?');
}

// Facebook Page
{
  const page = encodeURIComponent(env.META_PAGE_ID?.trim() || 'me');
  const t = env.META_PAGE_ACCESS_TOKEN;
  say('## Facebook Page');
  const p = await get(FB, page, t, { fields: 'name,followers_count,fan_count' });
  say(p.error ? `Page: ${p.error}` : `${p.name}: ${p.followers_count ?? '?'} followers, ${p.fan_count ?? '?'} likes`);
  for (const m of ['page_post_engagements', 'page_views_total', 'page_daily_follows_unique', 'page_media_view']) {
    say(`last 28 days ${m}: ${await metric(FB, `${page}/insights`, t, m, { period: 'day', since, until })}`);
  }
  const posts = await get(FB, `${page}/published_posts`, t, { fields: 'id,created_time,message,shares,reactions.summary(true).limit(0),comments.summary(true).limit(0)', limit: '15' });
  if (posts.error) say(`Posts: ${posts.error}`);
  else {
    say('');
    say('| date | post | reach | views | clicks | reactions | comments | shares |');
    say('|---|---|---|---|---|---|---|---|');
    for (const x of posts.data ?? []) {
      const reach = await metric(FB, `${x.id}/insights`, t, 'post_impressions_unique', {});
      const views = await metric(FB, `${x.id}/insights`, t, 'post_media_view', {});
      const clicks = await metric(FB, `${x.id}/insights`, t, 'post_clicks', {});
      say(`| ${day(x.created_time)} | ${short(x.message)} | ${reach} | ${views} | ${clicks} | ${x.reactions?.summary?.total_count ?? 0} | ${x.comments?.summary?.total_count ?? 0} | ${x.shares?.count ?? 0} |`);
    }
  }
  say('');
}

// Instagram
{
  const t = env.INSTAGRAM_ACCESS_TOKEN;
  say('## Instagram');
  const me = await get(IG, 'me', t, { fields: 'username,account_type,followers_count,follows_count,media_count' });
  say(me.error ? `Account: ${me.error}` : `@${me.username} (${me.account_type ?? 'type unknown'}): ${me.followers_count} followers, follows ${me.follows_count}, ${me.media_count} posts`);
  for (const m of ['reach', 'views', 'accounts_engaged', 'total_interactions', 'profile_views', 'follows_and_unfollows']) {
    say(`last 28 days ${m}: ${await metric(IG, 'me/insights', t, m, { period: 'day', metric_type: 'total_value', since, until })}`);
  }
  const media = await get(IG, 'me/media', t, { fields: 'id,caption,timestamp,media_type,like_count,comments_count', limit: '15' });
  if (media.error) say(`Posts: ${media.error}`);
  else {
    say('');
    say('| date | post | reach | views | likes | comments | saves | shares | follows |');
    say('|---|---|---|---|---|---|---|---|---|');
    for (const x of media.data ?? []) {
      const m: Record<string, string> = {};
      for (const k of ['reach', 'views', 'saved', 'shares', 'follows']) m[k] = await metric(IG, `${x.id}/insights`, t, k, {});
      say(`| ${day(x.timestamp)} | ${short(x.caption)} | ${m.reach} | ${m.views} | ${x.like_count ?? 0} | ${x.comments_count ?? 0} | ${m.saved} | ${m.shares} | ${m.follows} |`);
    }
  }
  say('');
}

// Threads
{
  const t = env.THREADS_ACCESS_TOKEN;
  say('## Threads');
  const me = await get(TH, 'me', t, { fields: 'username' });
  say(me.error ? `Account: ${me.error}` : `@${me.username}`);
  for (const m of ['followers_count', 'views', 'likes', 'replies', 'reposts']) {
    say(`${m}: ${await metric(TH, 'me/threads_insights', t, m, { since, until })}`);
  }
  const posts = await get(TH, 'me/threads', t, { fields: 'id,text,timestamp', limit: '15' });
  if (posts.error) say(`Posts: ${posts.error}`);
  else {
    say('');
    say('| date | post | views | likes | replies | reposts | shares |');
    say('|---|---|---|---|---|---|---|');
    for (const x of posts.data ?? []) {
      const m: Record<string, string> = {};
      for (const k of ['views', 'likes', 'replies', 'reposts', 'shares']) m[k] = await metric(TH, `${x.id}/insights`, t, k, {});
      say(`| ${day(x.timestamp)} | ${short(x.text)} | ${m.views} | ${m.likes} | ${m.replies} | ${m.reposts} | ${m.shares} |`);
    }
  }
}

const report = out.join('\n');
console.log(report);
if (env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(env.GITHUB_STEP_SUMMARY, report + '\n');
