/**
 * Reel tools (workflow "Reels"). Nothing here posts publicly except `switch`, which only schedules.
 *
 *   npm run reels -- check 6         Is story 006's Reel online? Instagram and Threads process it as a test
 *                                     container that is never published (it expires by itself within 24 hours).
 *   npm run reels -- switch 6 30     For stories 006-030: schedule the Facebook Reel at the story's slot, and only
 *                                     once that worked, delete the scheduled picture post it replaces and update
 *                                     data/sent.json. Stories already posted are never touched.
 *   DRY_RUN=1 ...                    show what would happen, change nothing
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadStories, ROOT } from './lib/stories';
import { postStoryToSocials } from './lib/social-post';
import { deleteFacebookObject, waitForUrl } from './lib/meta';
import { usesReel } from './lib/reel';
import { absoluteUrl } from '../src/lib/url';
import { pad3 } from '../src/schema/story';

const [action, a, b] = process.argv.slice(2);
const from = Number(a);
const to = Number(b || a);
if (!['check', 'switch'].includes(action) || !from) throw new Error('Usage: npm run reels -- check <story> | switch <first> [last]');
const dryRun = process.env.DRY_RUN === '1';
const SENT = path.join(ROOT, 'data/sent.json');
// Never during the morning posting window (06:00-10:45 Singapore): the daily run saves data/sent.json then too.
const sgHour = (new Date().getUTCHours() + 8) % 24 + new Date().getUTCMinutes() / 60;
if (action === 'switch' && !dryRun && sgHour >= 6 && sgHour < 10.75) throw new Error('Not between 06:00 and 10:45 Singapore time: the daily run may be posting. Run it later.');
const stories = loadStories().stories.filter((s) => !s.data.draft && s.data.number >= from && s.data.number <= to);
let failed = 0;

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

  // switch
  const file = JSON.parse(fs.readFileSync(SENT, 'utf8'));
  const records = (file.social ?? []) as { number: number; network: string; status?: string; detail: string }[];
  const old = records.find((r) => r.number === story.data.number && r.network === 'facebook');
  if (old?.status === 'posted') {
    console.log(`${n}: already posted on Facebook; left as it is`);
    continue;
  }
  if (old?.detail.includes(' reel ')) {
    console.log(`${n}: Facebook Reel already scheduled`);
    continue;
  }
  if (story.data.date.getTime() < Date.now() + 15 * 60e3) {
    console.log(`${n}: too close to its slot to reschedule safely; left as it is`);
    continue;
  }
  if (story.data.date.getTime() > Date.now() + 27 * 86_400_000) {
    console.log(`${n}: beyond Meta's 27-day window; the daily run schedules its Reel later`);
    continue;
  }
  const oldId = old?.detail.match(/(\d+_\d+)/)?.[1];
  if (dryRun) {
    console.log(`${n}: would schedule the Facebook Reel for ${story.data.date.toISOString()}${oldId ? ` and then delete picture post ${oldId}` : ''}`);
    continue;
  }
  const [o] = await postStoryToSocials(story, { kind: 'scheduled', webLive: false, dryRun: false, networks: ['facebook'], scheduleAt: story.data.date });
  if (o.status !== 'drafted') {
    console.log(`${n}: ERROR the Reel could not be scheduled (${o.detail}); the picture post stays scheduled`);
    failed++;
    continue;
  }
  // Save the Reel at once (a re-run must never schedule a second one). Until the picture post is deleted, the record
  // keeps its id under "leftover", and npm run verify reports it as an error every evening.
  const save = (leftover?: string) => {
    const f = JSON.parse(fs.readFileSync(SENT, 'utf8'));
    f.social = [
      ...(f.social ?? []).filter((r: { number: number; network: string }) => !(r.number === story.data.number && r.network === 'facebook')),
      { number: story.data.number, network: 'facebook', status: 'scheduled', at: new Date().toISOString(), detail: o.detail, ...(leftover ? { leftover } : {}) },
    ];
    fs.writeFileSync(SENT, JSON.stringify(f, null, 2) + '\n');
  };
  save(oldId);
  if (oldId) {
    try {
      await deleteFacebookObject(oldId);
      save();
      console.log(`${n}: ${o.detail}; deleted picture post ${oldId}`);
    } catch (e) {
      console.log(`${n}: ERROR ${o.detail}, but the picture post ${oldId} could not be deleted (${(e as Error).message}); both would publish`);
      failed++;
    }
  } else console.log(`${n}: ${o.detail}`);
}
if (failed) process.exitCode = 1;
