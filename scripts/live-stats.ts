/**
 * Live results feed for the phone dashboard (public/live/) and the iPhone Dynamic Island (PushWard). Read only on every
 * network: it posts nothing to Instagram, Threads, TikTok or YouTube.
 *   READ_META=1               read Instagram and Threads now (the workflow does this every 5 minutes)
 *   PREV_FILE=prev.json       the last live.json (keeps the time of the last Dynamic Island update)
 *   OUT_FILE=live.json        written here; the workflow pushes it to the live-stats branch
 *   ZERNIO_API_KEY            TikTok and YouTube numbers (repo secret, never printed)
 *   PUSHWARD_KEY              optional: when set, updates the Dynamic Island board (repo secret, never printed)
 *   npm run live-stats
 * Owner, 11 Nov 2026: one view of views, likes, shares and followers on IG, TikTok, YouTube and Threads, live.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, STORIES_DIR } from './lib/stories';
import { storyIdMap, storyForId } from './lib/story-ids';
import * as pw from './lib/pushward';
import * as pwWidget from './lib/pushward-widget';

const env = process.env;
const API = 'https://zernio.com/api/v1';
const KEY = env.ZERNIO_API_KEY?.trim().match(/sk_[0-9a-f]{64}/)?.[0];
const PUSH_KEY = env.PUSHWARD_KEY?.trim().match(/hlk_[A-Za-z0-9_-]+/)?.[0];
const DASHBOARD = env.DASHBOARD_URL ?? 'https://immigrationlabsg.github.io/football-stories-101/live/';
const readJson = (f: string | undefined, fallback: any = null) => {
  try {
    return f ? JSON.parse(fs.readFileSync(f, 'utf8')) : fallback;
  } catch {
    return fallback;
  }
};

type Post = { story: number | null; title: string; at: string | null; views: number | null; likes: number | null; shares: number | null; comments: number | null; url: string | null };
type Net = { followers: number | null; posts: Post[]; error?: string };

// Story titles ("Lyon 2002–08" from "Lyon 2002–08 / Seven straight titles ...").
const titles = new Map<number, string>();
for (const f of fs.readdirSync(STORIES_DIR)) {
  const s = fs.readFileSync(path.join(STORIES_DIR, f), 'utf8');
  const n = Number(/^number:\s*(\d+)/m.exec(s)?.[1]);
  const t = /^title:\s*"?(.*?)"?\s*$/m.exec(s)?.[1];
  // Header name (owner, 11 Nov 2026): "Lyon 2002–08" -> "Lyon"; names like "Pelé v Cristiano Ronaldo" stay as they are.
  if (n && t) titles.set(n, t.split(' / ')[0].replace(/\s+\d{4}\s*(?:–|-|to)\s*\d{2,4}$/, '').trim());
}
const titleOf = (n: number | null) => (n == null ? '' : titles.get(n) ?? `Story ${n}`);

// ---- Instagram and Threads: read straight from Meta when READ_META=1 (every 5 minutes), otherwise the last numbers ----
// Light on purpose: the same keys post the daily Reels, so only the latest 3 posts and the follower count are read
// (about 12 calls), well inside Meta's hourly limits (owner, 11 Nov 2026: today's Reel only, refreshed fast).
const prev = readJson(env.PREV_FILE, {});
const storyOf = storyIdMap(readJson(path.join(ROOT, 'data/sent.json'), { social: [] }).social ?? []);
async function mget(base: string, route: string, token: string | undefined, params: Record<string, string> = {}): Promise<any> {
  if (!token) return { error: 'no key saved' };
  try {
    const r = await fetch(`${base}/${route}?${new URLSearchParams({ ...params, access_token: token })}`, { signal: AbortSignal.timeout(20000) });
    const j: any = await r.json().catch(() => ({}));
    return !r.ok || j.error ? { error: String(j.error?.message ?? r.status).slice(0, 120) } : j; // never the URL: it holds the key
  } catch {
    return { error: 'network error' };
  }
}
const metricOf = (j: any): number | null => {
  const d = j?.data?.[0];
  const v = d?.total_value?.value ?? d?.values?.[0]?.value;
  return typeof v === 'number' ? v : v == null ? null : Number(v);
};
async function fromMeta(k: 'instagram' | 'threads'): Promise<Net> {
  if (env.READ_META !== '1' && prev.networks?.[k]) return prev.networks[k];
  const IG = 'https://graph.instagram.com/v21.0', TH = 'https://graph.threads.net/v1.0';
  const posts: Post[] = [];
  if (k === 'instagram') {
    const t = env.INSTAGRAM_ACCESS_TOKEN;
    const me = await mget(IG, 'me', t, { fields: 'followers_count' });
    const media = await mget(IG, 'me/media', t, { fields: 'id,timestamp,like_count,comments_count,permalink', limit: '3' });
    if (media.error) return { ...(prev.networks?.instagram ?? { followers: null, posts: [] }), error: media.error };
    for (const x of media.data ?? []) {
      const story = storyForId(storyOf, x.id);
      const views = metricOf(await mget(IG, `${x.id}/insights`, t, { metric: 'views' }));
      const shares = metricOf(await mget(IG, `${x.id}/insights`, t, { metric: 'shares' }));
      posts.push({ story, title: titleOf(story), at: x.timestamp ? new Date(x.timestamp).toISOString() : null, views, likes: x.like_count ?? null, shares, comments: x.comments_count ?? null, url: x.permalink ?? null });
    }
    return { followers: me.followers_count ?? null, posts };
  }
  const t = env.THREADS_ACCESS_TOKEN;
  const now = Math.floor(Date.now() / 1000);
  const followers = metricOf(await mget(TH, 'me/threads_insights', t, { metric: 'followers_count', since: String(now - 2 * 86400), until: String(now) }));
  const list = await mget(TH, 'me/threads', t, { fields: 'id,timestamp,permalink', limit: '3' });
  if (list.error) return { ...(prev.networks?.threads ?? { followers: null, posts: [] }), error: list.error };
  for (const x of list.data ?? []) {
    const story = storyForId(storyOf, x.id);
    const ins = await mget(TH, `${x.id}/insights`, t, { metric: 'views,likes,replies,shares' });
    const m: Record<string, number | null> = {};
    for (const d of ins.data ?? []) m[d.name] = d.total_value?.value ?? d.values?.[0]?.value ?? null;
    posts.push({ story, title: titleOf(story), at: x.timestamp ? new Date(x.timestamp).toISOString() : null, views: m.views ?? null, likes: m.likes ?? null, shares: m.shares ?? null, comments: m.replies ?? null, url: x.permalink ?? null });
  }
  return { followers, posts };
}

// ---- TikTok and YouTube: from Zernio ----
async function api(route: string): Promise<any> {
  if (!KEY) throw new Error('ZERNIO_API_KEY is not set');
  const r = await fetch(`${API}${route}`, { headers: { Authorization: `Bearer ${KEY}` }, signal: AbortSignal.timeout(30000) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${route.split('?')[0]} -> ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}
async function fromZernio(platform: 'tiktok' | 'youtube'): Promise<Net> {
  const recs: any[] = readJson(path.join(ROOT, `data/${platform}.json`), { posts: [] }).posts ?? [];
  const storyByPost = new Map(recs.filter((r) => r.postId).map((r) => [String(r.postId), r.number as number]));
  try {
    const from = new Date(Date.now() - 21 * 86400e3).toISOString().slice(0, 10);
    const list = await api(`/analytics?platform=${platform}&source=all&limit=50&fromDate=${from}`);
    const posts: Post[] = (list.posts ?? list.data ?? []).map((p: any) => {
      const pa = (p.platformAnalytics ?? []).find((x: any) => x.platform === platform) ?? {};
      const a = { ...(p.analytics ?? {}), ...(pa.analytics ?? {}) };
      const story = storyByPost.get(String(p.postId ?? p._id ?? p.latePostId)) ?? storyByPost.get(String(p.latePostId)) ?? null;
      return { story, title: story ? titleOf(story) : String(p.content ?? '').split('\n')[0].slice(0, 60), at: p.publishedAt ?? p.scheduledFor ?? null, views: a.views ?? null, likes: a.likes ?? null, shares: a.shares ?? null, comments: a.comments ?? null, url: p.platformPostUrl ?? pa.platformPostUrl ?? null };
    });
    let followers: number | null = null;
    const acc = (list.accounts ?? []).find((a: any) => a.platform === platform);
    if (acc?.followerCount != null) followers = acc.followerCount;
    if (followers == null) {
      const fs2 = await api('/accounts/follower-stats').catch(() => null);
      const rows: any[] = fs2?.accounts ?? fs2?.data ?? (Array.isArray(fs2) ? fs2 : []);
      const row = rows.find((a: any) => a.platform === platform);
      followers = row?.currentFollowers ?? row?.followerCount ?? row?.followers ?? null;
      if (followers == null) console.log(`${platform}: follower count not found (follower-stats keys: ${fs2 ? Object.keys(fs2).join(',') : 'none'}; first row keys: ${rows[0] ? Object.keys(rows[0]).join(',') : 'none'})`);
    }
    return { followers, posts };
  } catch (e) {
    // Keep the last numbers on a passing error, so the page and island never blank out for a minute.
    return { ...(prev.networks?.[platform] ?? { followers: null, posts: [] }), error: (e as Error).message.slice(0, 200) };
  }
}

const nets: Record<string, Net> = {
  instagram: await fromMeta('instagram'),
  tiktok: await fromZernio('tiktok'),
  youtube: await fromZernio('youtube'),
  threads: await fromMeta('threads'),
};
for (const n of Object.values(nets)) n.posts.sort((a, b) => Date.parse(b.at ?? '0') - Date.parse(a.at ?? '0'));

// "Today's story": the daily Reel (under 900) posted most recently on any network, so it switches the moment the new
// Reel posts (08:00 weekdays, 10:00 weekends) and the Dynamic Island is updated straight away (owner, 11 Nov 2026).
const daily = Object.values(nets).flatMap((n) => n.posts).filter((p) => p.story != null && p.story < 900 && Date.parse(p.at ?? '0') <= Date.now()).sort((a, b) => Date.parse(b.at ?? '0') - Date.parse(a.at ?? '0'))[0]?.story ?? null;
const out: any = { schema: 1, read_at: new Date().toISOString(), today_story: daily, today_title: titleOf(daily), networks: nets, island: prev.island ?? {}, widget: prev.widget ?? {} };

// ---- Dynamic Island (PushWard board) and Home Screen widget: scripts/lib/pushward.ts, scripts/lib/pushward-widget.ts ----
// Free plan budgets: 250 Live Activity and 50 widget updates a month. PUSHWARD_PLAN=paid lifts the island to every 5 min.
const short = (v: number | null) => (v == null ? '–' : v >= 1e6 ? `${(v / 1e6).toFixed(1)}m` : v >= 1e4 ? `${Math.round(v / 1e3)}k` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(v));
const todayOf = (n: Net) => n.posts.find((x) => x.story === daily);
const postedAt = Object.values(nets).map((n) => todayOf(n)?.at).filter(Boolean).sort()[0] ?? null;
const monthOf = (t: string) => t.slice(0, 7);
const nowIso = new Date().toISOString();
if (!PUSH_KEY) console.log('Dynamic Island and widget: PUSHWARD_KEY not set, skipped.');
else if (daily != null) {
  const isl = out.island as { pushes?: string[]; story?: number; last_start?: string | null; views?: Record<string, number | null> };
  isl.pushes = (isl.pushes ?? []).filter((t) => monthOf(t) === monthOf(nowIso));
  const plan = env.PUSHWARD_PLAN === 'paid' ? 'paid' : 'free';
  const base = { now: nowIso, postedAt, lastPushes: isl.pushes, plan, storyChanged: isl.story !== daily, force: env.FORCE_PUSH === '1', lastStart: isl.last_start ?? null } as const;
  let d = pw.shouldPush({ ...base, quotaUsedThisMonth: isl.pushes.length });
  if (d.push) {
    // Confirm with PushWard's own counter and the activity's state before spending an update.
    const q = await pw.getQuota({ key: PUSH_KEY });
    const act = await pw.getActivity({ key: PUSH_KEY, slug: 'fs101-results' });
    d = pw.shouldPush({ ...base, quotaUsedThisMonth: q.ok && q.used != null ? q.used : isl.pushes.length, quotaLimit: q.ok ? q.limit : null, quotaFromApi: q.ok && q.used != null, activityState: act.ok ? act.state : null });
  }
  if (!d.push) console.log(`Dynamic Island: not now (${d.reason}).`);
  else {
    const stats = Object.fromEntries(Object.entries(nets).map(([k, n]) => { const p = todayOf(n); return [k, { views: p?.views ?? null, likes: p?.likes ?? null, shares: p?.shares ?? null, comments: p?.comments ?? null, followers: n.followers }]; }));
    const content = pw.buildBoard({ name: titleOf(daily), stats, previousViews: isl.story === daily ? isl.views : undefined, url: DASHBOARD });
    const r = await pw.pushBoard({ key: PUSH_KEY, slug: 'fs101-results', name: 'FS101 results', content, restart: d.restart });
    if (r.ok) {
      for (let i = 0; i < Math.max(1, r.updates); i++) isl.pushes.push(nowIso);
      Object.assign(isl, { story: daily, views: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, v.views])), ...(d.restart || isl.story !== daily ? { last_start: nowIso } : {}) });
      console.log(`Dynamic Island updated (${d.reason}); ${isl.pushes.length} updates this month.`);
    } else console.log(`::warning::Dynamic Island update failed: ${r.error ?? r.status}${r.quotaExceeded ? ' (monthly quota used up)' : ''}`);
  }
  // Home Screen widget
  const wd = (out.widget ??= {}) as { last_push?: string; count?: number; story?: number };
  const w = pwWidget.shouldUpdateWidget({ now: new Date(), storyChanged: wd.story !== daily, updatesThisMonth: wd.count ?? 0, lastUpdate: wd.last_push ?? null });
  if (w.update) {
    const r = await pwWidget.pushWidget({ key: PUSH_KEY, payload: pwWidget.buildWidget(out, { dashboardUrl: DASHBOARD }) });
    if (r.ok) { Object.assign(wd, { last_push: nowIso, count: w.used + 1, story: daily }); console.log(`Widget updated (${w.reason}).`); }
    else console.log(`::warning::Widget update failed: ${r.error ?? r.status}`);
  }
}

fs.writeFileSync(env.OUT_FILE ?? 'live.json', JSON.stringify(out, null, 1) + '\n');
for (const [k, n] of Object.entries(nets)) {
  const p = n.posts.find((x) => x.story === daily);
  console.log(`${k.padEnd(9)} followers ${short(n.followers).padStart(5)} | today ${daily}: views ${short(p?.views ?? null)}, likes ${short(p?.likes ?? null)}, shares ${short(p?.shares ?? null)} | ${n.posts.length} posts${n.error ? ` | ERROR ${n.error}` : ''}`);
}
const broken = Object.entries(nets).filter(([, n]) => n.error).map(([k]) => k);
if (broken.length === 4) process.exitCode = 1; // nothing read at all
