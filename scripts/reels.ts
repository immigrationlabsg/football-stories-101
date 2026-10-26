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
 *   npm run reels -- replace 17      Like switch, for one story, and also re-upload its scheduled Reel if the video changed
 *                                     since it was scheduled (a repainted picture, new cards): records keep the hash of the
 *                                     Reel they sent (reels.json on the site); no hash, or another one, means replace.
 *   npm run reels -- caption 6 30    Bring the text of Facebook Reels already scheduled up to date (e.g. the AI disclosure
 *                                     added on 25 Oct 2026) by editing them at Meta; nothing is re-uploaded.
 *   DRY_RUN=1 ...                    show what would happen, change nothing
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadStories, ROOT } from './lib/stories';
import { postStoryToSocials } from './lib/social-post';
import { socialPosts } from './lib/social';
import { deleteFacebookObject, waitForUrl } from './lib/meta';

type FbRecord = { number: number; network: string; status?: string; at?: string; detail: string; leftover?: string; story?: string; reel?: string };
import { legacyMusicTag, musicTag, usesReel } from './lib/reel';
import { absoluteUrl } from '../src/lib/url';
import { pad3 } from '../src/schema/story';

const [action, a, b] = process.argv.slice(2);
const from = Number(a);
const to = Number(b || a);
if (!['check', 'switch', 'replace', 'confirm', 'caption'].includes(action) || !from) throw new Error('Usage: npm run reels -- check <story> | switch|replace|confirm|caption <first> [last]');
const dryRun = process.env.DRY_RUN === '1';
// Older records carry no hash, so "replace" would re-upload every Reel in a range: one story at a time.
if (action === 'replace' && to !== from) throw new Error('replace takes one story at a time (from and to the same number)');
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

// The hash each Reel online was made from (reels.json, written by scripts/images.ts): it changes whenever the video does.
let liveHashes: Record<string, string> | null = null;
async function liveReelHash(number: number): Promise<string | undefined> {
  if (!liveHashes) {
    try {
      const r = await fetch(absoluteUrl('/images/derived/reels.json'));
      liveHashes = r.ok ? ((await r.json()) as Record<string, string>) : {};
    } catch {
      liveHashes = {};
    }
  }
  return liveHashes[pad3(number)];
}

// Which story each Reel online shows (reel-stories.json, written by scripts/images.ts). A slot can be given to another
// story (owner, 25 Oct 2026: "on this day" comparisons every third day), and the Reel keeps the slot's file name, so
// Facebook must only be sent the file once the site shows the new story's Reel.
let liveStories: Record<string, string> | null = null;
async function liveStoryMatches(number: number, slug: string): Promise<boolean> {
  if (!liveStories) {
    try {
      const r = await fetch(absoluteUrl('/images/derived/reel-stories.json'));
      liveStories = r.ok ? ((await r.json()) as Record<string, string>) : {};
    } catch {
      liveStories = {};
    }
  }
  return liveStories[pad3(number)] === slug;
}

// What Meta says about a Facebook Reel: confirmed only with the same test the upload uses (processing complete, no
// phase in error, scheduled or published); failed when Meta reports an error; unknown when Meta could not be asked.
async function reelState(id?: string, since?: string): Promise<{ kind: 'ok' | 'failed' | 'unknown'; why: string }> {
  if (!id) return { kind: 'unknown', why: 'no Reel id in the record' };
  // Half an hour after the upload, a Reel that has not started processing or publishing never will.
  const stale = since ? Date.now() - Date.parse(since) > 30 * 60e3 : false;
  try {
    const v = await call(`https://graph.facebook.com/v21.0/${id}`, { fields: 'status', access_token: process.env.META_PAGE_ACCESS_TOKEN! }, 'GET');
    const st = v.status ?? {};
    const phases = [st.uploading_phase?.status, st.processing_phase?.status, st.publishing_phase?.status];
    if (st.video_status === 'error' || st.video_status === 'expired' || phases.includes('error')) return { kind: 'failed', why: JSON.stringify(st).slice(0, 200) };
    const pub = st.publishing_phase?.publish_status;
    if (st.processing_phase?.status === 'complete' && (pub === 'scheduled' || pub === 'published')) return { kind: 'ok', why: pub };
    if (stale && (st.processing_phase?.status === 'not_started' || (st.processing_phase?.status === 'complete' && pub && pub !== 'scheduled' && pub !== 'published'))) {
      return { kind: 'failed', why: `never scheduled: ${JSON.stringify(st).slice(0, 200)}` };
    }
    return { kind: 'unknown', why: `still processing: ${JSON.stringify(st).slice(0, 200)}` };
  } catch (e) {
    const msg = (e as Error).message;
    if (/does not exist/.test(msg) && (await pageReadable())) return { kind: 'failed', why: 'Meta no longer has it' };
    return { kind: 'unknown', why: msg };
  }
}
// The record's own post: a Reel must pass reelState; a picture post must exist and still be unpublished-scheduled or published.
async function mainPostScheduled(detail: string): Promise<boolean> {
  const reel = detail.match(/ reel (\d+)/)?.[1];
  if (reel) return (await reelState(reel)).kind === 'ok';
  const post = detail.match(/(\d+_\d+)/)?.[1];
  if (!post) return false;
  try {
    await call(`https://graph.facebook.com/v21.0/${post}`, { fields: 'id,is_published', access_token: process.env.META_PAGE_ACCESS_TOKEN! }, 'GET');
    return true;
  } catch {
    return false;
  }
}
let pageCheck: boolean | null = null;
async function pageReadable(): Promise<boolean> {
  if (pageCheck === null) {
    try {
      await call(`https://graph.facebook.com/v21.0/${process.env.META_PAGE_ID}`, { fields: 'id', access_token: process.env.META_PAGE_ACCESS_TOKEN! }, 'GET');
      pageCheck = true;
    } catch {
      pageCheck = false;
    }
  }
  return pageCheck;
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

  if (action === 'caption') {
    const rec = ((JSON.parse(fs.readFileSync(SENT, 'utf8')).social ?? []) as FbRecord[]).find(
      (r) => r.number === story.data.number && r.network === 'facebook' && r.detail.includes(' reel ') && !r.detail.includes('UNCONFIRMED'),
    );
    if (!rec || story.data.date.getTime() < Date.now() + 15 * 60e3) {
      console.log(`${n}: no Facebook Reel waiting to publish; skipped`);
      continue;
    }
    if (rec.story && rec.story !== story.data.slug) {
      // The slot was handed to another story: this Reel shows the old one. Replace it with "switch", never relabel it.
      console.log(`${n}: ERROR Facebook Reel belongs to "${rec.story}", not "${story.data.slug}"; run the switch first`);
      failed++;
      continue;
    }
    const reel = rec.detail.match(/ reel (\d+)/)![1];
    const state = await reelState(reel, rec.at);
    if (state.kind !== 'ok') {
      console.log(`${n}: Facebook Reel ${reel} is not confirmed at Meta (${state.why}); text left as it is`);
      failed++;
      continue;
    }
    const same = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();
    const want = socialPosts(story, { kind: 'scheduled', webLive: false }).facebook;
    const token = process.env.META_PAGE_ACCESS_TOKEN!;
    try {
      const v = await call(`https://graph.facebook.com/v21.0/${reel}`, { fields: 'description', access_token: token }, 'GET');
      if (same(v.description ?? '', want)) {
        console.log(`${n}: Facebook Reel ${reel} text is already up to date`);
        continue;
      }
      if (dryRun) {
        console.log(`${n}: would update the text of Facebook Reel ${reel}`);
        continue;
      }
      await call(`https://graph.facebook.com/v21.0/${reel}`, { description: want, access_token: token });
      const after = await call(`https://graph.facebook.com/v21.0/${reel}`, { fields: 'description', access_token: token }, 'GET');
      if (!same(after.description ?? '', want)) throw new Error('Meta did not keep the new text');
      console.log(`${n}: Facebook Reel ${reel} text updated`);
      await new Promise((r) => setTimeout(r, 5000));
    } catch (e) {
      console.log(`${n}: ERROR could not update the text of Facebook Reel ${reel}: ${(e as Error).message}`);
      failed++;
    }
    continue;
  }

  if (action === 'confirm') {
    const file = JSON.parse(fs.readFileSync(SENT, 'utf8'));
    const mine = ((file.social ?? []) as FbRecord[]).filter((r) => r.number === story.data.number && r.network === 'facebook');
    for (const rec of mine) {
      if (!rec.detail.includes('UNCONFIRMED') && !rec.leftover) continue;
      const reel = rec.detail.match(/ reel (\d+)/)?.[1];
      if (rec.detail.includes('UNCONFIRMED')) {
        const state = await reelState(reel, rec.at);
        if (state.kind === 'unknown') {
          // Meta could not be asked: the Reel may well be scheduled. Change nothing; try again later.
          console.log(`${n}: ERROR could not check Facebook Reel ${reel} (${state.why}); nothing changed. Run "Reels" confirm again later.`);
          failed++;
          continue;
        }
        if (state.kind === 'failed') {
          // The Reel will not publish: give the story back its earlier post, so the next switch replaces it properly.
          const ids = (rec.leftover ?? '').split(' ').filter(Boolean);
          if (!dryRun) {
            // Only once the failed Reel is provably gone may the record forget it; otherwise it could still publish.
            let gone = false;
            try {
              await deleteFacebookObject(reel!);
              gone = true;
            } catch (e) {
              gone = /does not exist/.test((e as Error).message) && (await pageReadable());
            }
            if (!gone) {
              console.log(`${n}: ERROR Facebook Reel ${reel} looks failed (${state.why}) but could not be deleted; nothing changed. Run confirm again later.`);
              failed++;
              continue;
            }
            if (ids.length) {
              const back = ids.at(-1)!;
              rec.detail = `scheduled for ${story.data.date.toISOString()} ${back.includes('_') ? back : `reel ${back} (music: unknown) UNCONFIRMED: restored after Reel ${reel} failed at Meta`}${back.includes('_') ? ` (restored: Reel ${reel} failed at Meta)` : ''}`;
              if (ids.length > 1) rec.leftover = ids.slice(0, -1).join(' ');
              else delete rec.leftover;
            } else file.social = (file.social as FbRecord[]).filter((r) => r !== rec);
            fs.writeFileSync(SENT, JSON.stringify(file, null, 2) + '\n');
          }
          console.log(`${n}: ERROR Facebook Reel ${reel} failed at Meta (${state.why}); ${ids.length ? `the earlier post ${ids.at(-1)} ${dryRun ? 'would be put' : 'is'} back as the story's Facebook post` : `the record ${dryRun ? 'would be' : 'is'} removed so the story is scheduled again`}. The next switch run replaces it.`);
          failed++;
          continue;
        }
        if (!dryRun) {
          rec.detail = rec.detail.replace(/ UNCONFIRMED:.*$/, '');
          fs.writeFileSync(SENT, JSON.stringify(file, null, 2) + '\n');
        }
        console.log(`${n}: Facebook Reel ${reel} is processed and ${state.why} at Meta; ${dryRun ? 'would mark' : 'marked'} confirmed`);
      }
      if (!rec.leftover) continue;
      // Delete the posts this one replaced only when this one is confirmed to be scheduled at Meta.
      if (!(await mainPostScheduled(rec.detail))) {
        console.log(`${n}: ERROR the story's own Facebook post is not confirmed at Meta, so leftover ${rec.leftover} is kept; run confirm again later`);
        failed++;
        continue;
      }
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
          // Meta answers "does not exist" for a post that is gone AND for one this key cannot see. Only trust it when
          // the key can still read the Page and the id belongs to this Page (Page_post ids start with the Page id).
          const pageOk = await pageReadable();
          const ours = id.includes('_') ? id.startsWith(`${process.env.META_PAGE_ID}_`) : true;
          if (/does not exist/.test(msg) && pageOk && ours) console.log(`${n}: leftover ${id} is already gone`);
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
    }
    continue;
  }

  // switch
  const file = JSON.parse(fs.readFileSync(SENT, 'utf8'));
  const records = (file.social ?? []) as FbRecord[];
  const old = records.find((r) => r.number === story.data.number && r.network === 'facebook');
  if (old?.status === 'posted') {
    console.log(`${n}: already posted on Facebook; left as it is`);
    continue;
  }
  const tag = musicTag(story.data.number);
  // A record that names another story belongs to the story this slot had before: its Reel is replaced whatever its music.
  const replaced = Boolean(old?.story && old.story !== story.data.slug);
  // "replace": a Reel of this story whose video has changed online since it was scheduled (or that predates the hash).
  const liveHash = await liveReelHash(story.data.number);
  const changed = action === 'replace' && Boolean(old?.detail.includes(' reel ')) && !replaced && old?.reel !== liveHash;
  if (action === 'replace' && !liveHash) {
    console.log(`${n}: ERROR the site has no Reel hash for this story (is it still deploying?); nothing changed`);
    failed++;
    continue;
  }
  if (old?.detail.includes(' reel ') && !replaced && !changed) {
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
  const what = replaced
    ? `Reel of the story this slot had before (${old?.story})`
    : changed
      ? 'Reel with the earlier video'
      : old?.detail.includes(' reel ')
        ? 'older Reel'
        : 'picture post';
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
  if (!(await liveStoryMatches(story.data.number, story.data.slug))) {
    console.log(`${n}: ERROR the Reel online is not yet the one for "${story.data.slug}" (is the site still deploying?); nothing changed`);
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
      { number: story.data.number, network: 'facebook', status: 'scheduled', at: new Date().toISOString(), detail, story: story.data.slug, ...(liveHash ? { reel: liveHash } : {}), ...(leftover ? { leftover } : {}) },
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
