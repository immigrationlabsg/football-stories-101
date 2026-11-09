/**
 * Read-only audience report: followers, reach and per-post numbers from Facebook, Instagram and Threads.
 * Changes nothing. Each figure is asked for separately, so a missing permission shows as one line, not a failure.
 *   npm run insights
 *
 * Snapshot option (improvement loop, docs/improvement-loop.md section 3): set SNAPSHOT_FILE=data/metrics/YYYY-MM-DD.json
 * and the same numbers are also written there as JSON, with the time they were read. Printing and the calls to Meta
 * are unchanged; the snapshot only collects what the report already reads.
 *   SNAPSHOT_FILE=data/metrics/2026-11-10.json npm run insights
 */
import { storyIdMap, storyForId } from './lib/story-ids';

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
// ---- Snapshot (only written when SNAPSHOT_FILE is set) ----
const snapFile = env.SNAPSHOT_FILE?.trim();
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null; // "n/a (...)" and "?" become null
};
const snap = {
  schema: 1,
  read_at: new Date().toISOString(),
  facebook: { followers: null as number | null, page_likes: null as number | null, reels: [] as any[], posts: [] as any[] },
  instagram: { followers: null as number | null, posts: [] as any[] },
  threads: { followers: null as number | null, posts: [] as any[] },
};
// Story number of each post, read from data/sent.json (the Page id is never used as a key: scripts/lib/story-ids.ts).
const storyOf = await (async () => {
  const fs = await import('node:fs');
  try {
    return storyIdMap(JSON.parse(fs.readFileSync('data/sent.json', 'utf8')).social);
  } catch {
    return new Map<string, number>(); // no sent.json: story numbers stay null
  }
})();
const storyFor = (id: string | undefined) => storyForId(storyOf, id);
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
  if (!p.error) {
    snap.facebook.followers = num(p.followers_count);
    snap.facebook.page_likes = num(p.fan_count);
  }
  for (const m of ['page_post_engagements', 'page_views_total', 'page_daily_follows_unique', 'page_media_view']) {
    say(`last 28 days ${m}: ${await metric(FB, `${page}/insights`, t, m, { period: 'day', since, until })}`);
  }
  // Reels by their own ids from data/sent.json: video insights need only the Page key, not the post-list permission.
  {
    const fs = await import('node:fs');
    const sent = JSON.parse(fs.readFileSync('data/sent.json', 'utf8')).social as { number: number; network: string; detail: string }[];
    const reels = sent
      .filter((r) => r.network === 'facebook')
      .map((r) => ({ n: r.number, id: / reel (\d+)/.exec(r.detail)?.[1], at: /scheduled for (\S+)/.exec(r.detail)?.[1] }))
      .filter((r) => r.id && (!r.at || Date.parse(r.at) < Date.now()))
      .sort((a, b) => a.n - b.n);
    say('');
    say('| story | Facebook Reel | people reached | plays | plays incl. replays | avg watch (s) | reactions | comments | shares | note |');
    say('|---|---|---|---|---|---|---|---|---|---|');
    for (const r of reels) {
      // One metric per call: Meta rejects the whole request if any one name is not offered for this video.
      let why = '';
      const val = async (name: string) => {
        const v = await get(FB, `${r.id}/video_insights`, t, { metric: name });
        if (v.error) {
          why ||= `${name}: ${v.error}`;
          return 'n/a';
        }
        const x = v.data?.[0]?.values?.[0]?.value;
        return x === undefined ? 'n/a' : x;
      };
      const avg = await val('post_video_avg_time_watched');
      const social = (await val('post_video_social_actions')) as any;
      const reactions = await val('post_video_likes_by_reaction_type');
      const total = (o: any) => (o && typeof o === 'object' ? Object.values(o).reduce((a: number, b: any) => a + (Number(b) || 0), 0) : o);
      const reach = await val('post_impressions_unique');
      const plays = await val('blue_reels_play_count');
      const playsAll = await val('fb_reels_total_plays');
      const comments = social?.COMMENT ?? (typeof social === 'object' ? 0 : social);
      const shares = social?.SHARE ?? (typeof social === 'object' ? 0 : social);
      say(`| ${String(r.n).padStart(3, '0')} | ${r.id} | ${reach} | ${plays} | ${playsAll} | ${typeof avg === 'number' ? (avg / 1000).toFixed(1) : avg} | ${total(reactions)} | ${comments} | ${shares} | ${why.replace(/\|/g, '/')} |`);
      snap.facebook.reels.push({
        id: r.id, story: r.n, timestamp: r.at ?? null, likes: num(total(reactions)), comments: num(comments), shares: num(shares), saves: null,
        reposts: null, reach: num(reach), views: num(plays), views_incl_replays: num(playsAll), avg_watch_s: typeof avg === 'number' ? avg / 1000 : null, skip_rate: null,
      });
    }
  }
  const posts = await get(FB, `${page}/published_posts`, t, { fields: 'id,created_time,message,shares,reactions.summary(true).limit(0),comments.summary(true).limit(0)', limit: '15' });
  if (posts.error) say(`Older picture posts: ${posts.error}`);
  else {
    say('');
    say('| date | post | reach | views | clicks | reactions | comments | shares |');
    say('|---|---|---|---|---|---|---|---|');
    for (const x of posts.data ?? []) {
      const reach = await metric(FB, `${x.id}/insights`, t, 'post_impressions_unique', {});
      const views = await metric(FB, `${x.id}/insights`, t, 'post_media_view', {});
      const clicks = await metric(FB, `${x.id}/insights`, t, 'post_clicks', {});
      say(`| ${day(x.created_time)} | ${short(x.message)} | ${reach} | ${views} | ${clicks} | ${x.reactions?.summary?.total_count ?? 0} | ${x.comments?.summary?.total_count ?? 0} | ${x.shares?.count ?? 0} |`);
      snap.facebook.posts.push({
        id: x.id, story: storyFor(x.id), timestamp: x.created_time ?? null, likes: num(x.reactions?.summary?.total_count ?? 0), comments: num(x.comments?.summary?.total_count ?? 0),
        shares: num(x.shares?.count ?? 0), saves: null, reposts: null, reach: num(reach), views: num(views), avg_watch_s: null, skip_rate: null,
      });
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
  if (!me.error) snap.instagram.followers = num(me.followers_count);
  const profile = await get(IG, 'me', t, { fields: 'name,biography,website' });
  say(profile.error ? `Profile: ${profile.error}` : `Name field: ${profile.name ?? '(empty)'} / bio: ${short(profile.biography)} / website: ${profile.website ?? '(none)'}`);
  for (const m of ['reach', 'views', 'accounts_engaged', 'total_interactions', 'profile_views', 'profile_links_taps', 'follows_and_unfollows']) {
    say(`last 28 days ${m}: ${await metric(IG, 'me/insights', t, m, { period: 'day', metric_type: 'total_value', since, until })}`);
  }
  // Who is being reached: followers or strangers, and which surface or country. Meta holds some of these back on small accounts.
  for (const [m, breakdown, extra] of [
    ['reach', 'follow_type', { period: 'day', since, until }],
    ['reach', 'media_product_type', { period: 'day', since, until }],
    ['reached_audience_demographics', 'country', { period: 'lifetime', timeframe: 'this_month' }],
    ['engaged_audience_demographics', 'country', { period: 'lifetime', timeframe: 'this_month' }],
    ['follower_demographics', 'country', { period: 'lifetime' }],
  ] as [string, string, Record<string, string>][]) {
    const j = await get(IG, 'me/insights', t, { metric: m, metric_type: 'total_value', breakdown, ...extra });
    const results = j.data?.[0]?.total_value?.breakdowns?.[0]?.results as { dimension_values: string[]; value: number }[] | undefined;
    say(`${m} by ${breakdown}: ${j.error ? `n/a (${j.error})` : results?.length ? results.map((r) => `${r.dimension_values.join('/')} ${r.value}`).join(', ') : 'n/a (no data)'}`);
  }
  const media = await get(IG, 'me/media', t, { fields: 'id,caption,timestamp,media_type,like_count,comments_count', limit: '15' });
  if (media.error) say(`Posts: ${media.error}`);
  else {
    say('');
    say('| date | post | reach | views | likes | comments | saves | shares | follows | avg watch (ms) | total watch (ms) | skip rate |');
    say('|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const x of media.data ?? []) {
      const m: Record<string, string> = {};
      for (const k of ['reach', 'views', 'saved', 'shares', 'follows', 'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time', 'reels_skip_rate']) m[k] = await metric(IG, `${x.id}/insights`, t, k, {});
      say(`| ${day(x.timestamp)} | ${short(x.caption)} | ${m.reach} | ${m.views} | ${x.like_count ?? 0} | ${x.comments_count ?? 0} | ${m.saved} | ${m.shares} | ${m.follows} | ${m.ig_reels_avg_watch_time} | ${m.ig_reels_video_view_total_time} | ${m.reels_skip_rate} |`);
      snap.instagram.posts.push({
        id: x.id, story: storyFor(x.id), timestamp: x.timestamp ?? null, media_type: x.media_type ?? null, likes: num(x.like_count ?? 0), comments: num(x.comments_count ?? 0),
        shares: num(m.shares), saves: num(m.saved), reposts: null, reach: num(m.reach), views: num(m.views), follows: num(m.follows),
        avg_watch_ms: num(m.ig_reels_avg_watch_time), total_watch_ms: num(m.ig_reels_video_view_total_time), skip_rate: num(m.reels_skip_rate),
      });
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
    const v = await metric(TH, 'me/threads_insights', t, m, { since, until });
    say(`${m}: ${v}`);
    if (m === 'followers_count') snap.threads.followers = num(v);
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
      snap.threads.posts.push({
        id: x.id, story: storyFor(x.id), timestamp: x.timestamp ?? null, likes: num(m.likes), comments: num(m.replies), shares: num(m.shares), saves: null,
        reposts: num(m.reposts), reach: null, views: num(m.views), avg_watch_s: null, skip_rate: null,
      });
    }
  }
}

const report = out.join('\n');
console.log(report);
if (env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(env.GITHUB_STEP_SUMMARY, report + '\n');
if (snapFile) {
  const fs = await import('node:fs');
  const path = await import('node:path');
  fs.mkdirSync(path.dirname(snapFile), { recursive: true });
  fs.writeFileSync(snapFile, JSON.stringify(snap, null, 2) + '\n');
  console.error(`Snapshot written to ${snapFile}`);
}
