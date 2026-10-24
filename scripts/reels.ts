/**
 * Reel tools (workflow "Reels"). Nothing here posts publicly except `switch`, which only schedules.
 *
 *   npm run reels -- check 6         Is story 006's Reel online? Instagram and Threads process it as a test
 *                                     container that is never published (it expires by itself within 24 hours).
 *   npm run reels -- switch 6 30     For stories 006-030: schedule the Facebook Reel at the story's slot, and only
 *                                     once that worked, delete the scheduled picture post (or the older Reel with
 *                                     different music) it replaces and update data/sent.json. Stories already posted
 *                                     are never touched. At most MAX_UPLOADS (default 4) uploads a run, nearest first:
 *                                     Meta's anti-spam limit stopped a bulk run on 24 Oct 2026.
 *   npm run reels -- confirm 6 30    Tidy up after a switch: a Facebook Reel marked UNCONFIRMED is checked with Meta
 *                                     (scheduled or published = confirmed), and the "leftover" ids each record names
 *                                     (posts the switch meant to delete) are deleted once their Reel is confirmed.
 *   DRY_RUN=1 ...                    show what would happen, change nothing
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadStories, ROOT } from './lib/stories';
import { postStoryToSocials } from './lib/social-post';
import { deleteFacebookObject, waitForUrl } from './lib/meta';

type FbRecord = { number: number; network: string; status?: string; at?: string; detail: string; leftover?: string };
import { legacyMusicTag, musicTag, usesReel } from './lib/reel';
import { absoluteUrl } from '../src/lib/url';
import { pad3 } from '../src/schema/story';

const [action, a, b] = process.argv.slice(2);
const from = Number(a);
const to = Number(b || a);
if (!['check', 'switch', 'confirm'].includes(action) || !from) throw new Error('Usage: npm run reels -- check <story> | switch <first> [last] | confirm <first> [last]');
const dryRun = process.env.DRY_RUN === '1';
const SENT = path.join(ROOT, 'data/sent.json');
// Never during the morning posting window (06:00-10:45 Singapore): the daily run saves data/sent.json then too.
const sgHour = (new Date().getUTCHours() + 8) % 24 + new Date().getUTCMinutes() / 60;
if (action !== 'check' && !dryRun && sgHour >= 6 && sgHour < 10.75) throw new Error('Not between 06:00 and 10:45 Singapore time: the daily run may be posting. Run it later.');
const stories = loadStories().stories.filter((s) => !s.data.draft && s.data.number >= from && s.data.number <= to);
let failed = 0;
let uploads = 0;
let pending = 0;
const MAX_UPLOADS = Number(process.env.MAX_UPLOADS || 4);

// The music each Reel online was made with (public/images/derived/reel-music.json, written by scripts/images.ts).
let liveMusic: Record<string, string> | null = null;
async function liveMusicMatches(number: number): Promise<boolean> {
  if (!liveMusic) {
    try {
      const r = await fetch(absoluteUrl('/images/derived/reel-music.json'));
      liveMusic = r.ok ? ((await r.json()) as Record<string, string>) : {};
    } catch {
      liveMusic = {};
    }
  }
  return musicTag(number) === `(music: ${liveMusic[pad3(number)] ?? 'unknown'})`;
}

async function call(url: string, params: Record<string, string>, method = 'POST'): Promise<any> {
  const q = new URLSearchParams(params);
  const r = await fetch(method === 'GET' ? `${url}?${q}` : url, method === 'GET' ? undefined : { method, body: q });
  const j = (await r.json().catch(() => ({}))) as any;
  if (!r.ok || j.error) throw new Error(`Meta says ${j.error?.message ?? r.status}`);
  return j;
}

for (const story of stories) {
  const n = pad3(story.data.number);
  const reelUrl = absoluteUrl(`/images/derived/${n}-reel.mp4`);
  if (!usesReel(story.data.date)) {
    console.log(`${n}: dated before reels_from; stays a picture post`);
    continue;
  }
  if (action === 'check') {
    try {
      await waitForUrl(reelUrl, 1, 0);
      console.log(`${n}: Reel is online at ${reelUrl}`);
    } catch {
      console.log(`${n}: ERROR Reel is not online at ${reelUrl}`);
      failed++;
      continue;
    }
    // Instagram: create a Reel container and wait until Instagram has processed the video. Never published.
    try {
      const IG = 'https://graph.instagram.com/v21.0';
      const t = process.env.INSTAGRAM_ACCESS_TOKEN!;
      const c = await call(`${IG}/${process.env.META_IG_USER_ID}/media`, { media_type: 'REELS', video_url: reelUrl, caption: 'test', access_token: t });
      let s: any = {};
      for (let i = 0; i < 100 && !['FINISHED', 'ERROR', 'EXPIRED'].includes(s.status_code); i++) {
        await new Promise((r) => setTimeout(r, 3000));
        s = await call(`${IG}/${c.id}`, { fields: 'status_code,status', access_token: t }, 'GET');
      }
      console.log(`${n}: Instagram processed the Reel: ${s.status_code}${s.status ? ` (${s.status})` : ''} (test only, not published)`);
      if (s.status_code !== 'FINISHED') failed++;
    } catch (e) {
      console.log(`${n}: ERROR Instagram: ${(e as Error).message}`);
      failed++;
    }
    // Threads: the same, with a video container that is never published.
    try {
      const TH = 'https://graph.threads.net/v1.0';
      const t = process.env.THREADS_ACCESS_TOKEN!;
      const c = await call(`${TH}/me/threads`, { media_type: 'VIDEO', video_url: reelUrl, text: 'test', access_token: t });
      let s: any = {};
      for (let i = 0; i < 100 && !['FINISHED', 'ERROR', 'EXPIRED'].includes(s.status); i++) {
        await new Promise((r) => setTimeout(r, 3000));
        s = await call(`${TH}/${c.id}`, { fields: 'status,error_message', access_token: t }, 'GET');
      }
      console.log(`${n}: Threads processed the Reel: ${s.status}${s.error_message ? ` (${s.error_message})` : ''} (test only, not published)`);
      if (s.status !== 'FINISHED') failed++;
    } catch (e) {
      console.log(`${n}: ERROR Threads: ${(e as Error).message}`);
      failed++;
    }
    continue;
  }

  if (action === 'confirm') {
    const file = JSON.parse(fs.readFileSync(SENT, 'utf8'));
    const rec = (file.social ?? []).find((r: FbRecord) => r.number === story.data.number && r.network === 'facebook') as FbRecord | undefined;
    if (!rec || (!rec.detail.includes('UNCONFIRMED') && !rec.leftover)) continue;
    const reel = rec.detail.match(/ reel (\d+)/)?.[1];
    if (rec.detail.includes('UNCONFIRMED')) {
      let state = 'unknown';
      try {
        const v = await call(`https://graph.facebook.com/v21.0/${reel}`, { fields: 'status', access_token: process.env.META_PAGE_ACCESS_TOKEN! }, 'GET');
        state = v.status?.publishing_phase?.publish_status ?? v.status?.video_status ?? 'unknown';
      } catch (e) {
        state = `error: ${(e as Error).message}`;
      }
      if (state !== 'scheduled' && state !== 'published') {
        console.log(`${n}: ERROR Facebook Reel ${reel} is "${state}" at Meta, not scheduled; ${rec.leftover ? `the earlier post ${rec.leftover} is kept` : 'nothing else is scheduled'}. Needs a person: re-run switch for ${n} after removing this record, or schedule by hand.`);
        failed++;
        continue;
      }
      if (!dryRun) rec.detail = rec.detail.replace(/ UNCONFIRMED:.*$/, '');
      console.log(`${n}: Facebook Reel ${reel} is ${state} at Meta; ${dryRun ? 'would mark' : 'marked'} confirmed`);
    }
    // The Reel is confirmed, so the posts it replaced must go. A post Meta no longer has counts as gone.
    const keep: string[] = [];
    for (const id of (rec.leftover ?? '').split(' ').filter(Boolean)) {
      if (dryRun) {
        console.log(`${n}: would delete leftover ${id}`);
        keep.push(id);
        continue;
      }
      try {
        await deleteFacebookObject(id);
        console.log(`${n}: deleted leftover ${id}`);
      } catch (e) {
        const msg = (e as Error).message;
        if (/does not exist|code 100/.test(msg)) console.log(`${n}: leftover ${id} is already gone`);
        else {
          console.log(`${n}: ERROR could not delete leftover ${id}: ${msg}`);
          keep.push(id);
          failed++;
        }
      }
    }
    if (!dryRun) {
      if (keep.length) rec.leftover = keep.join(' ');
      else delete rec.leftover;
      fs.writeFileSync(SENT, JSON.stringify(file, null, 2) + '\n');
    }
    continue;
  }

  // switch
  const file = JSON.parse(fs.readFileSync(SENT, 'utf8'));
  const records = (file.social ?? []) as { number: number; network: string; status?: string; detail: string }[];
  const old = records.find((r) => r.number === story.data.number && r.network === 'facebook');
  if (old?.status === 'posted') {
    console.log(`${n}: already posted on Facebook; left as it is`);
    continue;
  }
  const tag = musicTag(story.data.number);
  if (old?.detail.includes(' reel ')) {
    // A Reel with today's music needs nothing. One scheduled before the music tag existed may already carry it.
    if (old.detail.includes(tag)) {
      console.log(`${n}: Facebook Reel already scheduled ${tag}`);
      continue;
    }
    if (!old.detail.includes('(music:') && legacyMusicTag(story.data.number) === tag) {
      if (!dryRun) {
        const f = JSON.parse(fs.readFileSync(SENT, 'utf8'));
        for (const r of f.social ?? []) if (r.number === story.data.number && r.network === 'facebook') r.detail = `${r.detail} ${tag}`;
        fs.writeFileSync(SENT, JSON.stringify(f, null, 2) + '\n');
      }
      console.log(`${n}: Facebook Reel already has this music; record ${dryRun ? 'would be' : ''} marked ${tag}`.replace('  ', ' '));
      continue;
    }
  }
  if (story.data.date.getTime() < Date.now() + 15 * 60e3) {
    console.log(`${n}: too close to its slot to reschedule safely; left as it is`);
    continue;
  }
  if (story.data.date.getTime() > Date.now() + 27 * 86_400_000) {
    console.log(`${n}: beyond Meta's 27-day window; the daily run schedules its Reel later`);
    continue;
  }
  // The post it replaces: a scheduled picture post (Page_post id) or a Reel with other music (video id).
  const oldId = old?.detail.match(/ reel (\d+)/)?.[1] ?? old?.detail.match(/(\d+_\d+)/)?.[1];
  const what = old?.detail.includes(' reel ') ? 'older Reel' : 'picture post';
  if (uploads >= MAX_UPLOADS) {
    console.log(`${n}: left for the next run (at most ${MAX_UPLOADS} uploads a run)`);
    pending++;
    continue;
  }
  if (!(await liveMusicMatches(story.data.number))) {
    console.log(`${n}: ERROR the Reel online does not carry ${tag} yet (is the site still deploying?); nothing changed`);
    failed++;
    continue;
  }
  if (dryRun) {
    uploads++;
    console.log(`${n}: would schedule the Facebook Reel ${tag} for ${story.data.date.toISOString()}${oldId ? ` and then delete ${what} ${oldId}` : ''}`);
    continue;
  }
  // Meta's anti-spam limit stopped uploads after 20 Reels in 10 minutes (24 Oct 2026, code 368): pace them.
  if (uploads++) await new Promise((r) => setTimeout(r, 60_000));
  const [o] = await postStoryToSocials(story, { kind: 'scheduled', webLive: false, dryRun: false, networks: ['facebook'], scheduleAt: story.data.date });
  // Save at once (a re-run must never schedule a second one). Ids that may still publish beside the record's own post
  // (a post that could not be deleted, a Reel Meta did not confirm) stay under "leftover", earlier ones included, and
  // npm run verify reports them as an error every evening until they are deleted.
  const prior = (old as { leftover?: string } | undefined)?.leftover;
  const save = (detail: string, ...extra: (string | undefined)[]) => {
    const leftover = [prior, ...extra].filter(Boolean).join(' ');
    const f = JSON.parse(fs.readFileSync(SENT, 'utf8'));
    f.social = [
      ...(f.social ?? []).filter((r: { number: number; network: string }) => !(r.number === story.data.number && r.network === 'facebook')),
      { number: story.data.number, network: 'facebook', status: 'scheduled', at: new Date().toISOString(), detail, ...(leftover ? { leftover } : {}) },
    ];
    fs.writeFileSync(SENT, JSON.stringify(f, null, 2) + '\n');
  };
  if (o.status !== 'drafted') {
    // Meta never accepted a Reel (an unconfirmed one comes back as scheduled, marked UNCONFIRMED): nothing new exists.
    console.log(`${n}: ERROR the Reel could not be scheduled (${o.detail}); ${old ? `the ${what} stays scheduled` : 'nothing is scheduled for it'}`);
    failed++;
    continue;
  }
  if (o.detail.includes('UNCONFIRMED')) {
    // Meta holds a new Reel it did not confirm: record it, keep the old post (one of them must publish) as leftover,
    // and leave the tidy-up to "Reels confirm" (npm run verify reports it as an error until then).
    save(o.detail, oldId);
    console.log(`${n}: ERROR ${o.detail}; ${oldId ? `the ${what} ${oldId} is kept as leftover` : 'recorded'}; run "Reels" with action confirm`);
    failed++;
    continue;
  }
  save(o.detail, oldId);
  if (oldId) {
    try {
      await deleteFacebookObject(oldId);
      save(o.detail);
      console.log(`${n}: ${o.detail}; deleted ${what} ${oldId}`);
    } catch (e) {
      console.log(`${n}: ERROR ${o.detail}, but the ${what} ${oldId} could not be deleted (${(e as Error).message}); both would publish`);
      failed++;
    }
  } else console.log(`${n}: ${o.detail}`);
}
if (pending) console.log(`${pending} story(ies) still to switch: run again later.`);
if (failed) process.exitCode = 1;
