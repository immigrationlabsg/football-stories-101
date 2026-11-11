/**
 * Live results feed for the phone dashboard (public/live/) and the iPhone Dynamic Island (PushWard). Read only on every
 * network: it posts nothing to Instagram, Threads, TikTok or YouTube.
 *   META_FILE=/tmp/meta.json  the snapshot `SNAPSHOT_FILE=... npm run insights` just wrote (Instagram, Threads)
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
  if (n && t) titles.set(n, t.split(' / ')[0]);
}
const titleOf = (n: number | null) => (n == null ? '' : titles.get(n) ?? `Story ${n}`);

// ---- Instagram and Threads: from the Meta snapshot ----
const meta = readJson(env.META_FILE, {});
const fromMeta = (k: 'instagram' | 'threads'): Net => {
  const m = meta?.[k];
  if (!m) return { followers: null, posts: [], error: 'not read' };
  return {
    followers: m.followers ?? null,
    posts: (m.posts ?? []).map((p: any) => ({ story: p.story ?? null, title: titleOf(p.story ?? null), at: p.timestamp ? new Date(p.timestamp).toISOString() : null, views: p.views ?? null, likes: p.likes ?? null, shares: p.shares ?? null, comments: p.comments ?? null, url: null })),
  };
};

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
    return { followers: null, posts: [], error: (e as Error).message.slice(0, 200) };
  }
}

const nets: Record<string, Net> = {
  instagram: fromMeta('instagram'),
  tiktok: await fromZernio('tiktok'),
  youtube: await fromZernio('youtube'),
  threads: fromMeta('threads'),
};
for (const n of Object.values(nets)) n.posts.sort((a, b) => Date.parse(b.at ?? '0') - Date.parse(a.at ?? '0'));

// "Today's story": the daily Reel (under 900) posted most recently on any network, so it switches the moment the new
// Reel posts (08:00 weekdays, 10:00 weekends) and the Dynamic Island is updated straight away (owner, 11 Nov 2026).
const daily = Object.values(nets).flatMap((n) => n.posts).filter((p) => p.story != null && p.story < 900 && Date.parse(p.at ?? '0') <= Date.now()).sort((a, b) => Date.parse(b.at ?? '0') - Date.parse(a.at ?? '0'))[0]?.story ?? null;
const prev = readJson(env.PREV_FILE, {});
const out: any = { schema: 1, read_at: new Date().toISOString(), today_story: daily, today_title: titleOf(daily), networks: nets, island: prev.island ?? {} };

// ---- Dynamic Island (PushWard board, 4 tiles). Free plan: 250 updates a month, so about every 2 hours, 08:00-23:00 SGT. ----
const short = (v: number | null) => (v == null ? '–' : v >= 1e6 ? `${(v / 1e6).toFixed(1)}m` : v >= 1e4 ? `${Math.round(v / 1e3)}k` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}k` : String(v));
const sgHour = new Date(Date.now() + 8 * 3600e3).getUTCHours();
const gapMin = Number(env.PUSH_EVERY_MIN ?? 115);
const due = PUSH_KEY && sgHour >= 8 && sgHour <= 23 && (env.FORCE_PUSH === '1' || (daily != null && out.island.story !== daily) || Date.now() - Date.parse(out.island.last_push ?? '0') >= gapMin * 60e3);
if (!PUSH_KEY) console.log('Dynamic Island: PUSHWARD_KEY not set, skipped.');
else if (!due) console.log(`Dynamic Island: not due (last update ${out.island.last_push ?? 'never'}, Singapore hour ${sgHour}).`);
else {
  const label: Record<string, string> = { instagram: 'IG', tiktok: 'TikTok', youtube: 'YouTube', threads: 'Threads' };
  const icon: Record<string, string> = { instagram: 'camera', tiktok: 'music.note', youtube: 'play.rectangle.fill', threads: 'at' };
  const tiles = Object.entries(nets).map(([k, n]) => {
    const p = n.posts.find((x) => x.story === daily);
    return { label: `${label[k]} ♥${short(p?.likes ?? null)} ↗${short(p?.shares ?? null)} 👤${short(n.followers)}`.slice(0, 32), value: short(p?.views ?? null), unit: 'views', icon: icon[k], url_action: { url: DASHBOARD } };
  });
  const total = Object.values(nets).reduce((t, n) => t + (n.posts.find((x) => x.story === daily)?.views ?? 0), 0);
  const H = { Authorization: `Bearer ${PUSH_KEY}` };
  const slug = 'fs101-results';
  try {
    const c = await fetch('https://api.pushward.app/activities', { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, name: 'FS101 results', priority: 5, stale_ttl: 3 * 3600 }), signal: AbortSignal.timeout(20000) });
    if (!c.ok) throw new Error(`create ${c.status} ${(await c.text()).slice(0, 200)}`);
    const body = { state: 'ongoing', content: { template: 'board', state: `${daily ?? ''} ${titleOf(daily)}`.trim().slice(0, 60), icon: 'soccerball', accent_color: 'green', compact_label: 'FS', compact_trailing_label: short(total).slice(0, 4), tiles, url_action: { url: DASHBOARD } } };
    const r = await fetch(`https://api.pushward.app/activities/${slug}`, { method: 'PATCH', headers: { ...H, 'Content-Type': 'application/merge-patch+json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`update ${r.status} ${(await r.text()).slice(0, 200)}`);
    out.island = { last_push: new Date().toISOString(), story: daily, total };
    console.log(`Dynamic Island updated: ${short(total)} views on today's story.`);
  } catch (e) {
    console.log(`::warning::Dynamic Island update failed: ${(e as Error).message}`);
  }
}

fs.writeFileSync(env.OUT_FILE ?? 'live.json', JSON.stringify(out, null, 1) + '\n');
for (const [k, n] of Object.entries(nets)) {
  const p = n.posts.find((x) => x.story === daily);
  console.log(`${k.padEnd(9)} followers ${short(n.followers).padStart(5)} | today ${daily}: views ${short(p?.views ?? null)}, likes ${short(p?.likes ?? null)}, shares ${short(p?.shares ?? null)} | ${n.posts.length} posts${n.error ? ` | ERROR ${n.error}` : ''}`);
}
const broken = Object.entries(nets).filter(([, n]) => n.error).map(([k]) => k);
if (broken.length === 4) process.exitCode = 1; // nothing read at all
