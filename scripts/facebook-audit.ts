/**
 * Facebook schedule audit (workflow "Facebook audit"). Read only: it changes nothing on Facebook or in the repo.
 *
 * Why (owner, 16 Nov 2026): Facebook still held Reels scheduled on 8 Nov for stories 028-030 after those Reels were
 * rebuilt and approved, so it would have published the old videos and captions. Instagram and Threads take the Reel
 * from the site at posting time; a Facebook Reel is uploaded ahead and keeps whatever video and caption it had then.
 *
 * For every story due in the next DAYS days (default 10) that has a scheduled Facebook record in data/sent.json, it
 * checks that the record belongs to the slot's current story and was made from the Reel the site serves now (the hash
 * in /images/derived/reels.json; scripts/reels.ts saves it in the record as "reel"). A mismatch due within URGENT_HOURS
 * (default 36) is an ERROR and the run fails, so GitHub emails the owner; later ones are warnings. The fix for each is
 * printed: workflow "Reels", action replace, one story at a time, outside 06:00-10:45 Singapore.
 *
 *   npm run facebook-audit
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadStories, ROOT } from './lib/stories';
import { liveReelHash } from './lib/social-post';
import { absoluteUrl } from '../src/lib/url';
import { pad3 } from '../src/schema/story';

type Rec = { number: number; network: string; status?: string; detail?: string; story?: string; reel?: string };
const DAYS = Number(process.env.DAYS || 10);
const URGENT_HOURS = Number(process.env.URGENT_HOURS || 36);
const sent = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sent.json'), 'utf8'));
const social: Rec[] = sent.social ?? [];
const now = Date.now();

async function liveStories(): Promise<Record<string, string>> {
  try {
    const r = await fetch(absoluteUrl('/images/derived/reel-stories.json'));
    return r.ok ? ((await r.json()) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function main() {
  const onSite = await liveStories();
  if (!Object.keys(onSite).length) throw new Error('Could not read reel-stories.json from the site; the audit cannot run. Retry after the site deploys.');
  const upcoming = loadStories().stories.filter((s) => !s.data.draft && s.data.date.getTime() > now && s.data.date.getTime() - now < DAYS * 86400e3);
  const errors: string[] = [];
  const warnings: string[] = [];
  let ok = 0;
  for (const s of upcoming.sort((x, y) => x.data.number - y.data.number)) {
    const n = pad3(s.data.number);
    const r = social.find((x) => x.number === s.data.number && x.network === 'facebook' && x.status === 'scheduled');
    if (!r) continue; // Not scheduled ahead on Facebook: the day's run posts it from the site, so nothing can be stale.
    const hours = (s.data.date.getTime() - now) / 3600e3;
    const when = `${new Date(s.data.date.getTime() + 8 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')} SGT`;
    const fix = `run "Reels" with action replace, from ${s.data.number} to ${s.data.number}, Dry run unticked (outside 06:00-10:45 Singapore)`;
    const problems: string[] = [];
    if (r.story && r.story !== s.data.slug) problems.push(`Facebook holds "${r.story}", but the slot's story is now "${s.data.slug}"`);
    if (onSite[n] && onSite[n] !== s.data.slug) problems.push(`the site's Reel ${n} still shows "${onSite[n]}" (wait for the site to deploy)`);
    const live = await liveReelHash(s.data.number);
    if (!r.reel) problems.push('the Facebook record has no Reel hash, so it may hold an older video');
    else if (live && r.reel !== live) problems.push(`Facebook's scheduled Reel was made from an older video (${r.reel.slice(0, 8)}) than the one the site serves (${live.slice(0, 8)})`);
    if (!problems.length) {
      ok++;
      continue;
    }
    const line = `${n} (${when}): ${problems.join('; ')}. Fix: ${fix}.`;
    (hours < URGENT_HOURS ? errors : warnings).push(line);
  }
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.log(`ERROR: ${e}`);
  console.log(`Facebook audit: ${upcoming.length} stories due in ${DAYS} days, ${ok} scheduled Reels match the site, ${errors.length} error(s), ${warnings.length} warning(s).`);
  if (errors.length) process.exit(1);
}

main();
