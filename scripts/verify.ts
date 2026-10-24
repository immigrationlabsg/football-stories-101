/**
 * End-to-end check of everything a morning needs, not just the story files: run it before calling any
 * piece of work done (CLAUDE.md), and it runs on GitHub every evening before the next morning's post.
 * Errors exit 1; warnings are printed but do not fail.
 *
 *   npm run verify
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadStories, PUBLIC_DIR, ROOT } from './lib/stories';
import { INSTAGRAM_LIMIT, socialPosts } from './lib/social';
import { MUSIC_DIR, TRACKS, legacyMusicTag, musicTag, usesReel } from './lib/reel';

const errors: string[] = [];
const warnings: string[] = [];
const DAY = 86_400_000;
const now = process.env.VERIFY_NOW ? new Date(process.env.VERIFY_NOW) : new Date();
const pad = (n: number) => String(n).padStart(3, '0');

const { stories, errors: loadErrors } = loadStories();
errors.push(...loadErrors);
const schedule = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/schedule.json'), 'utf8'));
const sent = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sent.json'), 'utf8'));
const live = stories.filter((s) => !s.data.draft).sort((a, b) => a.data.date.getTime() - b.data.date.getTime());

// 1. Every story is complete and fits the social formats.
for (const s of stories) {
  const n = pad(s.data.number);
  if (!s.file.startsWith(`${n}-`)) errors.push(`${s.file}: file name does not start with its number ${n}`);
  if (s.data.facts.length !== 5) errors.push(`${n}: ${s.data.facts.length} facts; the 7-card carousel needs 5`);
  if (!s.data.hook) errors.push(`${n}: no hook (the banner line on the pictures)`);
  if (!s.data.question) errors.push(`${n}: no reader question`);
  if (!fs.existsSync(path.join(PUBLIC_DIR, s.data.hero.src))) errors.push(`${n}: hero picture ${s.data.hero.src} is missing`);
  if (!fs.existsSync(path.join(ROOT, `docs/fact-checks/${n}.md`))) errors.push(`${n}: no fact-check log docs/fact-checks/${n}.md`);
  const posts = socialPosts(s, { kind: 'scheduled', webLive: false });
  if (Buffer.byteLength(posts.threads, 'utf8') > 500) errors.push(`${n}: Threads text is over 500 bytes`);
  if (!/More on Instagram: instagram\.com\//.test(posts.threads)) errors.push(`${n}: Threads text has no Instagram link`);
  if (/github\.io|football-stories-101\//i.test(posts.facebook + posts.threads)) errors.push(`${n}: a social post links the website`);
  if (posts.threadsReply) errors.push(`${n}: Threads has a separate reply; the link belongs in the post`);
  const len = posts.facebook.length;
  if (len > INSTAGRAM_LIMIT) errors.push(`${n}: post is ${len} characters, over Instagram's ${INSTAGRAM_LIMIT}`);
}
// No story twice: a subject may return only as a marked follow-up with a different angle.
const seen = new Map<string, number>();
for (const s of [...stories].sort((a, b) => a.data.number - b.data.number)) {
  const [subject, angle = ''] = s.data.title.split(' / ');
  const key = subject.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
  const titleKey = s.data.title.trim().toLowerCase();
  if (stories.some((o) => o !== s && o.data.title.trim().toLowerCase() === titleKey)) errors.push(`${pad(s.data.number)}: the same title as another story`);
  const earlier = seen.get(key);
  if (earlier && s.data.followUpOf !== earlier) {
    errors.push(`${pad(s.data.number)} returns to "${subject}" (story ${pad(earlier)}) without followUpOf: ${earlier}; give it a new angle and mark it, or drop it`);
  }
  if (!earlier) seen.set(key, s.data.number);
}
// Reserved angles in the story bank: a returning subject must say "(follow-up of NNN)".
const bank = fs.readFileSync(path.join(ROOT, 'docs/story-bank.md'), 'utf8');
const subjects = new Map(stories.map((s) => [s.data.title.split(' / ')[0].replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase(), s.data.number]));
for (const m of bank.matchAll(/^\| (\d{3}) \| \w+ \| (.+?) \| reserved \|$/gm)) {
  const subject = m[2].split(/[:/]/)[0].replace(/\s*\(.*?\)\s*/g, '').replace(/'s .*$/, '').trim().toLowerCase();
  const hit = [...subjects.entries()].find(([k]) => k === subject || k.startsWith(subject + ' ') || subject.startsWith(k + ' '));
  if (hit && !/follow-up of/i.test(m[2])) warnings.push(`bank angle ${m[1]} ("${m[2].slice(0, 50)}") returns to story ${pad(hit[1])} without "(follow-up of ${pad(hit[1])})"`);
}
const numbers = stories.map((s) => s.data.number);
if (new Set(numbers).size !== numbers.length) errors.push('two stories share a number');

// 2. The calendar: a launch date, one story per day, the right hour, nothing stranded as a draft.
if (live.length && !schedule.launch_date) errors.push('stories are scheduled but data/schedule.json has no launch_date');
if (schedule.launch_date) {
  const drafts = stories.filter((s) => s.data.draft);
  if (drafts.length) warnings.push(`${drafts.length} story(ies) still drafts: ${drafts.map((s) => pad(s.data.number)).join(', ')}`);
}
for (let i = 0; i < live.length; i++) {
  const s = live[i];
  const d = s.data.date;
  const weekend = [0, 6].includes(new Date(d.getTime() + 8 * 3600e3).getUTCDay());
  if (d.getUTCHours() !== (weekend ? 2 : 0) || d.getUTCMinutes() !== 0) errors.push(`${pad(s.data.number)}: ${d.toISOString()} is not the ${weekend ? '10:00' : '8:00'} SGT slot`);
  if (i > 0) {
    const gap = Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(live[i - 1].data.date.getUTCFullYear(), live[i - 1].data.date.getUTCMonth(), live[i - 1].data.date.getUTCDate())) / DAY);
    if (gap === 0) errors.push(`${pad(live[i - 1].data.number)} and ${pad(s.data.number)} are on the same day`);
    if (gap > 1) errors.push(`gap of ${gap - 1} day(s) with no story before ${pad(s.data.number)}`);
    if (s.data.pillar === live[i - 1].data.pillar) warnings.push(`${pad(live[i - 1].data.number)} and ${pad(s.data.number)} are both "${s.data.pillar}" back to back`);
  }
  if (i > 1) {
    const c = (x: typeof s) => x.data.countries[0];
    if (c(s) === c(live[i - 1]) && c(s) === c(live[i - 2])) warnings.push(`three ${c(s)} stories in a row ending at ${pad(s.data.number)}`);
  }
}
const last = live.at(-1);
const buffer = (schedule.min_buffer_days ?? 14) * DAY;
if (schedule.launch_date && (!last || last.data.date.getTime() < now.getTime() + buffer)) {
  warnings.push(`stories run out on ${last?.data.date.toISOString().slice(0, 10) ?? 'launch'}: less than ${schedule.min_buffer_days ?? 14} days ahead; draft more`);
}

// 3. Social posts: every upcoming story inside Facebook's scheduling window (the daily run fills it to 27 days) is scheduled.
const social = (sent.social ?? []) as { number: number; network: string; status?: string }[];
const has = (n: number, net: string) => social.some((r) => r.number === n && r.network === net);
for (const s of live) {
  const t = s.data.date.getTime();
  if (t > now.getTime() + 20 * 60e3 && t < now.getTime() + 26 * DAY && !has(s.data.number, 'facebook')) {
    warnings.push(`${pad(s.data.number)} (${s.data.date.toISOString().slice(0, 10)}) is not scheduled on Facebook yet; run "Schedule Facebook posts"`);
  }
  // A story is late once its slot is DELIVERY_GRACE_MIN minutes past (2 hours by default; the delivery check uses 20).
  const grace = Number(process.env.DELIVERY_GRACE_MIN ?? 120) * 60e3;
  if (t < now.getTime() - grace && t > now.getTime() - 7 * DAY) {
    for (const net of ['facebook', 'instagram', 'threads']) if (!has(s.data.number, net)) errors.push(`${pad(s.data.number)} was due ${s.data.date.toISOString().slice(0, 16)}Z but has no ${net} record in data/sent.json`);
  }
}

// Reels (from data/schedule.json reels_from): every music track is present and credited, and no upcoming Reel story
// still has a scheduled Facebook picture post (workflow "Reels", action switch, replaces them).
if (schedule.reels_from) {
  const credits = fs.existsSync(path.join(MUSIC_DIR, 'CREDITS.md')) ? fs.readFileSync(path.join(MUSIC_DIR, 'CREDITS.md'), 'utf8') : '';
  for (const t of TRACKS) {
    if (!fs.existsSync(path.join(MUSIC_DIR, t))) errors.push(`music track assets/music/${t} is missing (the Reels need it)`);
    else if (!credits.includes(t)) errors.push(`music track ${t} has no row in assets/music/CREDITS.md`);
  }
  for (const r of social as { number: number; network: string; leftover?: string }[]) {
    if (r.leftover) errors.push(`${pad(r.number)}: Facebook post(s) ${r.leftover} may publish beside the scheduled Reel; run "Reels" with action confirm and Dry run unticked for ${pad(r.number)} (it deletes them once the Reel is confirmed)`);
    if (/UNCONFIRMED/.test((r as { detail?: string }).detail ?? '')) errors.push(`${pad(r.number)}: Meta did not confirm this Facebook Reel; run "Reels" with action confirm and Dry run unticked for ${pad(r.number)}`);
  }
  for (const s of live) {
    const r = social.find((x) => x.number === s.data.number && x.network === 'facebook') as { status?: string; detail?: string } | undefined;
    if (usesReel(s.data.date) && s.data.date.getTime() > now.getTime() && r?.status === 'scheduled' && !r.detail?.includes(' reel ')) {
      warnings.push(`${pad(s.data.number)} is a Reel story but Facebook still has its picture post scheduled; run "Reels" with action switch`);
    } else if (usesReel(s.data.date) && s.data.date.getTime() > now.getTime() && r?.status === 'scheduled' && r.detail && !r.detail.includes(musicTag(s.data.number))
      && !(!r.detail.includes('(music:') && legacyMusicTag(s.data.number) === musicTag(s.data.number))) {
      warnings.push(`${pad(s.data.number)}'s Facebook Reel has other music than ${musicTag(s.data.number)}; run "Reels" with action switch`);
    }
  }
}

// 4. Keys the morning run needs (only checked where the secrets are present, i.e. on GitHub).
if (process.env.CHECK_SECRETS === '1') {
  for (const k of ['META_PAGE_ID', 'META_PAGE_ACCESS_TOKEN', 'META_IG_USER_ID', 'INSTAGRAM_ACCESS_TOKEN', 'THREADS_ACCESS_TOKEN', 'SECRETS_ADMIN_TOKEN']) {
    if (!process.env[k]?.trim()) errors.push(`GitHub secret ${k} is missing`);
  }
}

for (const w of warnings) console.log(`warning: ${w}`);
for (const e of errors) console.log(`ERROR: ${e}`);
console.log(`${stories.length} stories, ${live.length} scheduled (${live[0]?.data.date.toISOString().slice(0, 10) ?? '-'} to ${last?.data.date.toISOString().slice(0, 10) ?? '-'}): ${errors.length} error(s), ${warnings.length} warning(s).`);
if (errors.length) process.exitCode = 1;
