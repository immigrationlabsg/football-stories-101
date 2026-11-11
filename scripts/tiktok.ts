/**
 * TikTok through Zernio (workflow "TikTok"). The key is the ZERNIO_API_KEY repo secret; it is never printed.
 *
 *   MODE=accounts npm run tiktok                 read only: connected accounts and TikTok creator info
 *   MODE=post STORY=21 npm run tiktok            dry run: show the caption and video, post nothing
 *   MODE=post STORY=21 DRY_RUN=0 npm run tiktok  post that story's Reel to TikTok, public, with the AI label
 *   MODE=auto DRY_RUN=0 npm run tiktok           post every Instagram Reel of the last 20 hours not on TikTok yet
 *   MODE=music npm run tiktok                    read only: TikTok's trending Commercial Music Library tracks (COUNTRY=US)
 *   MODE=views npm run tiktok                    read only: views of every TikTok and YouTube post; fails (so GitHub
 *                                                emails the owner) if one has under 20 views 12-36 hours after posting
 *
 * Each post is recorded in data/tiktok.json, which stops a second post of the same story.
 * The caption is the Instagram caption (it ends with "Illustrations made with AI." and has no website link).
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadStories, ROOT } from './lib/stories';
import { socialPosts } from './lib/social';
import { absoluteUrl } from '../src/lib/url';
import { pad3 } from '../src/schema/story';

const API = 'https://zernio.com/api/v1';
// The saved value may carry extra text around the key (e.g. a copied "ZERNIO_API_KEY=..." line): use the key itself.
const RAW = process.env.ZERNIO_API_KEY?.trim();
const KEY = RAW?.match(/sk_[0-9a-f]{64}/)?.[0] ?? RAW;
const MODE = process.env.MODE ?? 'accounts';
const dryRun = process.env.DRY_RUN !== '0';
const PLATFORM = process.env.PLATFORM === 'youtube' ? 'youtube' : 'tiktok';
const LABEL = PLATFORM === 'youtube' ? 'YouTube' : 'TikTok';
const RECORD = path.join(ROOT, PLATFORM === 'youtube' ? 'data/youtube.json' : 'data/tiktok.json');

type Rec = { number: number; story: string; at: string; postId: string; status: string; url?: string | null; music?: string };

async function api(method: string, route: string, body?: unknown): Promise<any> {
  if (!KEY) throw new Error('ZERNIO_API_KEY is not set (repo secret).');
  // Shape only, never the key: Zernio keys are "sk_" plus 64 hex characters (67 in all).
  if (!/^sk_[0-9a-f]{64}$/.test(KEY)) throw new Error(`ZERNIO_API_KEY does not look like a Zernio key (length ${KEY.length}, starts with "sk_": ${KEY.startsWith('sk_')}, contains "sk_": ${KEY.includes('sk_')}). Copy the key again and re-save it.`);
  const r = await fetch(`${API}${route}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  if (!r.ok && r.status !== 207) throw new Error(`${method} ${route} -> ${r.status}: ${JSON.stringify(json).slice(0, 800)}`);
  return { status: r.status, ...json };
}

async function tiktokAccounts(): Promise<any[]> {
  const res = await api('GET', '/accounts?limit=50');
  const list: any[] = res.accounts ?? res.data ?? [];
  return list;
}

// Owner, 11 Nov 2026: add trending music to every TikTok post automatically (no hand step).
// Picks the highest-ranked trending Commercial Music Library song that suits a football story: a real song (not a
// sound effect or numbered stock jingle), an energetic genre, and a clip long enough to run under most of the Reel.
// The Reel keeps its own sound (voice and music) at full volume; the trending track sits low underneath.
// Any failure here posts the Reel without the extra track rather than blocking the post. TIKTOK_MUSIC=off turns it off.
const MUSIC_GENRES = /ELECTRONIC|HIP_HOP|POP|ROCK|EDM|TRAP|DJ|EPIC/i;
const NOT_A_SONG = /\(\d{5,}\)|vacuum|sound effect|\bsfx\b|impact|stinger|whoosh|vibration|pass by|jingle|christmas|lullaby|karaoke|meditation|\bhz\b/i;
async function pickTrack(accountId: string, seconds: number): Promise<{ id: string; label: string; end: number } | null> {
  if ((process.env.TIKTOK_MUSIC ?? 'on') === 'off') return null;
  try {
    const res = await api('GET', `/accounts/${accountId}/tiktok/commercial-music?countryCode=${process.env.COUNTRY ?? 'US'}`);
    const tracks: any[] = (res.tracks ?? []).slice().sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999));
    const ok = tracks.filter((t) => t.clip?.id && (t.clip.durationSec ?? 0) >= 45 && MUSIC_GENRES.test((t.genres ?? []).join('/'))
      && !NOT_A_SONG.test(`${t.name} ${t.artist}`));
    const t = ok[0];
    if (!t) return null;
    const end = Math.round(Math.min(seconds, t.clip.durationSec) * 1000);
    return { id: String(t.clip.id), label: `#${t.rank} ${t.name} - ${t.artist}`, end };
  } catch (e) {
    console.log(`Trending music not added: ${(e as Error).message.slice(0, 200)}`);
    return null;
  }
}

function records(): Rec[] {
  try {
    return JSON.parse(fs.readFileSync(RECORD, 'utf8')).posts ?? [];
  } catch {
    return [];
  }
}

async function postStory(number: number): Promise<void> {
  if (!Number.isInteger(number) || number <= 0) throw new Error('STORY must be a story number, e.g. 21.');
  const story = loadStories().stories.find((s) => s.data.number === number);
  if (!story) throw new Error(`No story ${number}.`);
  if (story.data.draft) throw new Error(`Story ${number} is a draft.`);
  if (records().some((r) => r.number === number)) {
    console.log(`Story ${number} is already on ${LABEL} (${path.basename(RECORD)}). Nothing posted.`);
    return;
  }
  const caption = socialPosts(story, { kind: 'scheduled', webLive: false }).instagram;
  // Owner rule: no website link in social posts.
  if (/https?:\/\/|github\.io|www\./i.test(caption)) throw new Error('The caption contains a link; nothing posted.');
  if (!caption.includes('Illustrations made with AI.')) throw new Error('The caption lacks the AI line; nothing posted.');
  if (caption.length > 2200) throw new Error(`The caption is ${caption.length} characters (TikTok allows 2,200).`);
  const videoUrl = absoluteUrl(`/images/derived/${pad3(number)}-reel.mp4`);
  const head = await fetch(videoUrl, { method: 'HEAD' });
  if (!head.ok) throw new Error(`The Reel is not on the site (${head.status}): ${videoUrl}`);

  const accounts = (await tiktokAccounts()).filter((a) => a.platform === PLATFORM);
  if (accounts.length !== 1) throw new Error(`Expected exactly 1 connected ${LABEL} account, found ${accounts.length}.`);
  const accountId = accounts[0]._id ?? accounts[0].id;
  // YouTube Short title, as on the hand-uploaded Shorts: the Reel's hook plus #shorts (YouTube allows 100 characters).
  const hook = (story.data.hook ?? story.data.question ?? story.data.title).trim();
  const title = `${hook} #shorts`.length <= 100 ? `${hook} #shorts` : hook.length <= 100 ? hook : (story.data.question ?? hook).slice(0, 100);
  // SCHEDULE_AT (ISO time, e.g. 2026-11-19T08:00:00+08:00): Zernio publishes it then instead of now.
  const at = process.env.SCHEDULE_AT?.trim();
  if (at && Number.isNaN(Date.parse(at))) throw new Error(`SCHEDULE_AT is not a time: ${at}`);
  const when = at ? { scheduledFor: new Date(at).toISOString() } : { publishNow: true };
  // The Short's thumbnail is the Reel's first frame, which carries the whole hook (owner, 11 Nov 2026). images.ts
  // writes it next to the Reel; if it isn't there, the Short still posts and YouTube picks its own frame.
  const coverUrl = absoluteUrl(`/images/derived/${pad3(number)}-cover.jpg`);
  const cover = PLATFORM === 'youtube' && (await fetch(coverUrl, { method: 'HEAD' }).catch(() => null))?.ok;
  if (PLATFORM === 'youtube') console.log(cover ? `Thumbnail: ${coverUrl}` : `No first-frame thumbnail at ${coverUrl}; YouTube will pick a frame.`);
  const ytBody = {
    content: caption,
    mediaItems: [{ type: 'video', url: videoUrl, ...(cover ? { thumbnail: coverUrl } : {}) }],
    platforms: [{ platform: 'youtube', accountId, platformSpecificData: { title, visibility: 'public', madeForKids: false, containsSyntheticMedia: true, categoryId: '17' } }],
    ...when,
  };
  const info: any = PLATFORM === 'youtube' ? {} : await api('GET', `/accounts/${accountId}/tiktok/creator-info?mediaType=video`);
  const levels: string[] = (info.privacyLevels ?? []).map((l: any) => (typeof l === 'string' ? l : l.value));
  if (levels.length && !levels.includes('PUBLIC_TO_EVERYONE')) throw new Error(`Public posting not allowed for this account: ${levels.join(', ')}`);

  const track = PLATFORM === 'youtube' ? null : await pickTrack(accountId, 70);
  const music = track ? { musicSoundInfo: { musicSoundId: track.id, musicSoundVolume: Number(process.env.MUSIC_VOLUME ?? 15), musicSoundStart: 0, musicSoundEnd: track.end }, videoOriginalSoundVolume: 100 } : {};
  const body = PLATFORM === 'youtube' ? ytBody : {
    content: caption,
    mediaItems: [{ type: 'video', url: videoUrl }],
    platforms: [{ platform: 'tiktok', accountId }],
    tiktokSettings: {
      privacy_level: 'PUBLIC_TO_EVERYONE',
      allow_comment: true,
      allow_duet: true, // owner 10 Nov 2026: allow reuse (Duet, Stitch), matching the account setting "Everyone"
      allow_stitch: true,
      video_made_with_ai: true, // TikTok's "AI-generated content" label: the paintings are made with AI
      video_cover_timestamp_ms: 0, // the cover is the first frame, which carries the whole hook (owner, 11 Nov 2026)
      ...music,
      content_preview_confirmed: true,
      express_consent_given: true,
    },
    publishNow: true,
  };
  if (track) console.log(`Trending music: ${track.label} (volume ${music.musicSoundInfo?.musicSoundVolume}, Reel sound 100)`);
  console.log(`Story ${number} -> ${LABEL}${PLATFORM === 'youtube' ? ` "${title}"${at ? ` at ${at}` : ''}` : ''} @${accounts[0].username ?? '?'}\nVideo: ${videoUrl}\nCaption (${caption.length} chars):\n${caption}\n`);
  if (dryRun) {
    console.log('Dry run: nothing posted.');
    return;
  }
  // Record the attempt BEFORE posting: if the answer is lost or says "failed" after the platform took it, the record
  // still stops the automatic runs from posting the story again. A failed attempt is left for the owner to retry by hand.
  const file = fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, 'utf8')) : { posts: [] };
  const rec: Rec = { number, story: story.data.slug, at: new Date().toISOString(), postId: '', status: 'attempting', url: null, ...(track ? { music: track.label } : {}) };
  file.posts.push(rec);
  const save = () => fs.writeFileSync(RECORD, JSON.stringify(file, null, 2) + '\n');
  save();
  try {
    let res: any;
    try {
      res = await api('POST', '/posts', body);
    } catch (e) {
      if (!track) throw e;
      res = { post: { status: 'failed', platforms: [{ errorMessage: (e as Error).message.slice(0, 200) }] } };
    }
    // A track TikTok refuses at publish time must not cost the day's post: retry once without it.
    if (track && (!res.post?._id || res.post?.status === 'failed')) {
      console.log(`Post with music failed (${res.post?.platforms?.[0]?.errorMessage ?? res.post?.status}); retrying without the trending track.`);
      const { musicSoundInfo: _m, videoOriginalSoundVolume: _v, ...plain } = (body as any).tiktokSettings;
      res = await api('POST', '/posts', { ...body, tiktokSettings: plain });
      delete rec.music;
    }
    const post = res.post ?? {};
    const p = (post.platforms ?? [])[0] ?? {};
    console.log(`Zernio: post ${post._id} status ${post.status}; ${LABEL} status ${p.status}${p.errorMessage ? `; error: ${p.errorMessage}` : ''}`);
    Object.assign(rec, { postId: post._id ?? '', status: post._id && post.status !== 'failed' ? post.status : `failed: ${p.errorMessage ?? post.status ?? 'no post id'}`, url: p.platformPostUrl ?? null });
    if (!post._id || post.status === 'failed') process.exitCode = 1;
  } catch (e) {
    rec.status = `failed or unknown: ${String((e as Error).message).slice(0, 200)}`;
    throw e;
  } finally {
    save();
  }
}

if (MODE === 'accounts') {
  const list = await tiktokAccounts();
  if (!list.length) console.log('No connected accounts.');
  for (const a of list) {
    console.log(`${a.platform}: @${a.username ?? a.displayName ?? '?'} id=${a._id ?? a.id} active=${a.isActive ?? '?'}`);
    if (a.platform === 'tiktok') {
      const info = await api('GET', `/accounts/${a._id ?? a.id}/tiktok/creator-info?mediaType=video`);
      const { status: _s, ...rest } = info;
      console.log(`  creator info: ${JSON.stringify(rest).slice(0, 1500)}`);
    }
  }
} else if (MODE === 'auto') {
  // Daily automation: post every Reel that went to Instagram in the last 20 hours and is not on this platform yet.
  // Started after "Publish daily" and "Post extras" finish, with backup times; data/tiktok.json stops a second post.
  const sent: any = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sent.json'), 'utf8'));
  const since = Date.now() - 20 * 3600 * 1000;
  const done = new Set(records().map((r) => r.number));
  // Reels only (a carousel is recorded as "media ..."), and only posts from the go-live day on, so an old story
  // re-posted by hand or as a test does not cross to TikTok.
  const GO_LIVE = Date.parse('2026-11-10T00:00:00Z');
  const due = [...new Set<number>((sent.social ?? [])
    .filter((e: any) => e.network === 'instagram' && e.status === 'posted' && String(e.detail ?? '').startsWith('reel media')
      && Date.parse(e.at) >= Math.max(since, GO_LIVE))
    .map((e: any) => e.number))].filter((n) => !done.has(n));
  // Held from automatic posting until the owner says yes in chat: 908 (Zidane) uses paintings from agency photos.
  const HOLD = new Set<number>([908]);
  for (const n of due.filter((n) => HOLD.has(n))) console.log(`Story ${n} is held: post it to ${LABEL} only by hand, after the owner's OK.`);
  due.splice(0, due.length, ...due.filter((n) => !HOLD.has(n)));
  if (!due.length) console.log(`Nothing due for ${LABEL}: no Instagram post in the last 20 hours that is not on ${LABEL} already.`);
  // Owner, 11 Nov 2026: one TikTok a day for two weeks while the new account warms up (3 of its first 5 posts got 0
  // views after three posts in about 21 hours). The daily story goes first; an extra only on a day with no other post.
  const WARM_UP_END = Date.parse('2026-11-25T16:00:00Z'); // end of 25 Nov, Singapore
  const sgDay = (t: number) => new Date(t + 8 * 3600e3).toISOString().slice(0, 10);
  let limit = 2;
  if (PLATFORM === 'tiktok' && Date.now() < WARM_UP_END) {
    due.sort((a, b) => Number(a >= 900) - Number(b >= 900) || a - b);
    const today = records().filter((r) => !r.status.startsWith('failed') && sgDay(Date.parse(r.at)) === sgDay(Date.now())).length;
    limit = today ? 0 : 1;
    if (due.length > limit) console.log(`Warm-up (until 25 Nov): one TikTok a day. Posting ${limit ? due[0] : 'nothing'} today${due.length > limit ? `; skipping ${due.slice(limit).join(', ')}` : ''}.`);
  }
  for (const n of due.slice(0, limit)) {
    try {
      await postStory(n);
    } catch (e) {
      console.error(`Story ${n}: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }
} else if (MODE === 'post') {
  await postStory(Number(process.env.STORY));
} else if (MODE === 'music') {
  // Read only. Works only for accounts connected through the TikTok for Business app (Zernio docs, "Locations & music").
  const acc = (await tiktokAccounts()).filter((a) => a.platform === 'tiktok');
  if (acc.length !== 1) throw new Error(`Expected exactly 1 connected TikTok account, found ${acc.length}.`);
  const id = acc[0]._id ?? acc[0].id;
  for (const cc of (process.env.COUNTRY ?? 'US,GB').split(',')) {
    const res = await api('GET', `/accounts/${id}/tiktok/commercial-music?countryCode=${cc.trim()}`);
    const tracks: any[] = res.tracks ?? [];
    console.log(`${cc}: ${tracks.length} trending tracks`);
    for (const t of tracks.slice(0, 40)) console.log(`  #${t.rank} ${t.name} - ${t.artist} [${(t.genres ?? []).join('/')}] ${t.durationSec}s clip=${t.clip?.id ?? '-'} (${t.clip?.durationSec ?? '-'}s)`);
  }
} else if (MODE === 'status') {
  for (const r of records()) {
    if (!r.postId) {
      console.log(`${r.number}: ${r.status} (no Zernio post id; check TikTok by hand)`);
      continue;
    }
    const res = await api('GET', `/posts/${r.postId}`);
    const p = (res.post?.platforms ?? [])[0] ?? {};
    console.log(`${r.number}: ${res.post?.status} ${p.platformPostUrl ?? ''} ${p.errorMessage ?? ''}`);
  }
} else if (MODE === 'views') {
  // Owner, 11 Nov 2026: alarm when a post is stuck near zero views (3 of the first 5 TikToks had 0; YouTube Shorts can
  // stall too). Read only. Each post is judged once, in the run 12-36 hours after it went out (WINDOW_HOURS widens it).
  const m = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec((process.env.WINDOW_HOURS ?? '12-36').trim());
  if (!m) throw new Error(`WINDOW_HOURS must look like 12-36, not "${process.env.WINDOW_HOURS}".`);
  const [lo, hi] = [Number(m[1]), Number(m[2])];
  // Scheduled runs measure age from that day's 13:15 UTC, not from when GitHub actually starts the job (often late), so
  // the daily 24-hour windows join up exactly and every post is judged once. Manual runs measure from now.
  const anchor = process.env.GITHUB_EVENT_NAME === 'schedule' ? (() => { const d = new Date(); d.setUTCHours(13, 15, 0, 0); return d.getTime() > Date.now() ? d.getTime() - 86400e3 : d.getTime(); })() : Date.now();
  const unread: string[] = [];
  const MIN = Number(process.env.MIN_VIEWS ?? 20);
  const lines: string[] = [];
  const stuck: string[] = [];
  for (const [platform, file] of [['TikTok', 'data/tiktok.json'], ['YouTube', 'data/youtube.json']] as const) {
    const recs: Rec[] = fs.existsSync(path.join(ROOT, file)) ? JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')).posts ?? [] : [];
    for (const r of recs) {
      const hours = (anchor - Date.parse(r.at)) / 3600e3;
      if (!r.postId || r.status.startsWith('failed') || hours < lo || hours >= hi) continue;
      let views: number | null = null;
      let note = '';
      try {
        const res = await api('GET', `/analytics?postId=${r.postId}`);
        views = res.analytics?.views ?? res.platformAnalytics?.[0]?.analytics?.views ?? null;
        if (res.status === 202 || views === null) note = `numbers not synced yet (${res.syncStatus ?? res.status})`;
      } catch (e) {
        note = `could not read (${(e as Error).message.slice(0, 120)})`;
      }
      const line = `${platform} ${pad3(r.number)} (${r.story}), ${hours.toFixed(0)} h old: ${views ?? '?'} views${note ? `; ${note}` : ''} ${r.url ?? ''}`;
      lines.push(line);
      if (note) unread.push(line);
      else if (views !== null && views < MIN) stuck.push(line);
    }
  }
  const report = [`Posts ${lo}-${hi} hours old:`, ...(lines.length ? lines : ['(none)']), '', stuck.length ? `STUCK under ${MIN} views:\n${stuck.join('\n')}` : `None under ${MIN} views.`, ...(unread.length ? ['', `COULD NOT READ (this is the only check of these posts):\n${unread.join('\n')}`] : [])].join('\n');
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\`\`\`\n${report}\n\`\`\`\n`);
  // The daily scoreboard (owner, 11 Nov 2026): how much of each YouTube Short people watch, lifetime so far. YouTube's
  // "stayed vs swiped" is not in its API, so this uses average percentage viewed (can pass 100% on Shorts, from loops).
  // Every Short on the channel, hand uploads included. Read only; a failure here never hides the alarm above.
  try {
    const yt = (await tiktokAccounts()).find((a) => a.platform === 'youtube');
    const accountId = yt?._id ?? yt?.id;
    const list = await api('GET', `/analytics?platform=youtube&source=all&limit=50&fromDate=${new Date(Date.now() - 60 * 86400e3).toISOString().slice(0, 10)}`);
    const posts: any[] = list.posts ?? list.data ?? [];
    const rows: { pct: number; line: string }[] = [];
    for (const p of posts) {
      const url: string = p.platformPostUrl ?? p.platformAnalytics?.[0]?.platformPostUrl ?? '';
      const id = /(?:v=|shorts\/|youtu\.be\/)([\w-]{11})/.exec(url)?.[1];
      if (!id || !accountId) continue;
      const d = await api('GET', `/analytics/youtube/daily-views?videoId=${id}&accountId=${accountId}&fromDate=${String(p.publishedAt ?? '').slice(0, 10) || '2026-11-01'}&toDate=${new Date().toISOString().slice(0, 10)}`).catch((e) => ({ error: (e as Error).message.slice(0, 160) }));
      const days: any[] = d?.dailyViews ?? [];
      const views = days.reduce((t, x) => t + (x.views ?? 0), 0);
      if (!views) { rows.push({ pct: -1, line: `   -    ${String(p.analytics?.views ?? '?').padStart(5)} views  ${(p.content ?? '').split('\n')[0].slice(0, 70)}  (no watch data yet${d?.error ? `: ${d.error}` : d?.provisionalSince ? `, provisional since ${d.provisionalSince}` : ''}) ${url}` }); continue; }
      const pct = days.reduce((t, x) => t + (x.averageViewPercentage ?? 0) * (x.views ?? 0), 0) / views;
      const secs = days.reduce((t, x) => t + (x.averageViewDuration ?? 0) * (x.views ?? 0), 0) / views;
      const subs = days.reduce((t, x) => t + (x.subscribersGained ?? 0) - (x.subscribersLost ?? 0), 0);
      rows.push({ pct, line: `${pct.toFixed(0).padStart(4)}%  ${String(views).padStart(5)} views  ${secs.toFixed(0).padStart(3)} s avg  ${subs >= 0 ? '+' : ''}${subs} subs  ${(d?.title ?? p.content ?? '').split('\n')[0].slice(0, 70)}` });
    }
    const board = ['', 'YouTube scoreboard (average % of each Short watched, lifetime; YouTube finalises numbers after about 3 days):', ...rows.sort((x, y) => y.pct - x.pct).map((r) => r.line)].join('\n');
    console.log(board);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\`\`\`${board}\n\`\`\`\n`);
  } catch (e) {
    console.log(`::warning::YouTube scoreboard could not be read: ${(e as Error).message.slice(0, 200)}`);
  }
  if (unread.length) {
    process.exitCode = 1;
    console.error(`::error::${unread.length} post(s) could not be checked (Zernio error, expired key or numbers not synced). Look at them in the app.`);
  }
  if (stuck.length) {
    process.exitCode = 1;
    console.error(`::error::${stuck.length} post(s) stuck under ${MIN} views. Likely causes: a held-back new account, reused-content or audio matching. Check the post in the app.`);
  }
} else {
  throw new Error(`Unknown MODE ${MODE} (accounts, auto, post, music, status or views).`);
}
