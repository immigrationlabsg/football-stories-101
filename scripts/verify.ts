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
import { AI_NOTE, INSTAGRAM_LIMIT, socialPosts } from './lib/social';
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
  if (s.data.format === 'quiz') {
    if (s.data.clues.length !== 4 || !s.data.answer) errors.push(`${n}: a Guess the legend quiz needs 4 clues and an answer`);
  } else if (s.data.facts.length !== 5) errors.push(`${n}: ${s.data.facts.length} facts; the 7-card carousel needs 5`);
  if (!s.data.hook) errors.push(`${n}: no hook (the banner line on the pictures)`);
  if (!s.data.question) errors.push(`${n}: no reader question`);
  if (!fs.existsSync(path.join(PUBLIC_DIR, s.data.hero.src))) errors.push(`${n}: hero picture ${s.data.hero.src} is missing`);
  if (!fs.existsSync(path.join(ROOT, `docs/fact-checks/${n}.md`))) errors.push(`${n}: no fact-check log docs/fact-checks/${n}.md`);
  const posts = socialPosts(s, { kind: 'scheduled', webLive: false });
  if (Buffer.byteLength(posts.threads, 'utf8') > 500) errors.push(`${n}: Threads text is over 500 bytes`);
  if (!/More on Instagram: instagram\.com\//.test(posts.threads)) errors.push(`${n}: Threads text has no Instagram link`);
  if (/github\.io|football-stories-101\//i.test(posts.facebook + posts.threads)) errors.push(`${n}: a social post links the website`);
  if (usesReel(s.data.date) && !posts.facebook.trimEnd().endsWith(AI_NOTE)) errors.push(`${n}: a post is missing the AI disclosure "${AI_NOTE}"`);
  if (posts.threadsReply) errors.push(`${n}: Threads has a separate reply; the link belongs in the post`);
  const len = posts.facebook.length;
  if (len > INSTAGRAM_LIMIT) errors.push(`${n}: post is ${len} characters, over Instagram's ${INSTAGRAM_LIMIT}`);
}
// No story twice: a subject may return only as a marked follow-up with a different angle.
const seen = new Map<string, number>();
for (const s of [...stories].sort((a, b) => a.data.number - b.data.number)) {
  // A "Guess the legend" title starts with the series name; its subject is the player (the answer).
  const subject = s.data.format === 'quiz' && s.data.answer ? s.data.answer : s.data.title.split(' / ')[0];
  const key = subject.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
  const titleKey = s.data.title.trim().toLowerCase();
  if (stories.some((o) => o !== s && o.data.title.trim().toLowerCase() === titleKey)) errors.push(`${pad(s.data.number)}: the same title as another story`);
  const earlier = seen.get(key);
  if (earlier && s.data.followUpOf !== earlier) {
    errors.push(`${pad(s.data.number)} returns to "${subject}" (story ${pad(earlier)}) without followUpOf: ${earlier}; give it a new angle and mark it, or drop it`);
  }
  if (!earlier) seen.set(key, s.data.number);
}
// One legend per week (owner, 26 Oct 2026): the same featured player in two pieces less than 7 days apart is an error,
// unless data/schedule.json lists that week as a special week for him. Featured = the two names of a comparison
// ("Messi v Ronaldo"), a quiz's answer, or the first name in a story's players (its main subject, listed first).
{
  const plain = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, '').trim().toLowerCase()
      .replace(/\u00e6/g, 'ae').replace(/\u00f8/g, 'o').replace(/\u00df/g, 'ss').replace(/[\u0111\u00f0]/g, 'd').replace(/\u00fe/g, 'th').replace(/\u0142/g, 'l');
  // A name as the players list spells it: an exact name first ("Ronaldo (R9)" for "Ronaldo"), then a surname
  // ("Cristiano Ronaldo" for "Ronaldo").
  const player = (s: (typeof live)[number], n: string) =>
    s.data.players.find((x) => plain(x) === plain(n)) ?? s.data.players.find((x) => plain(x).endsWith(` ${plain(n)}`));
  const featured = (s: (typeof live)[number]): string[] => {
    if (s.data.format === 'quiz' && s.data.answer) return [plain(player(s, s.data.answer) ?? s.data.answer)];
    const subject = s.data.title.split(' / ')[0];
    if (s.data.series === 'On this day' && / v /.test(subject)) {
      return subject.split(' v ').map((n) => {
        const p = player(s, n);
        if (!p) errors.push(`${pad(s.data.number)} names "${n.trim()}" in its title but no player in its players list matches; add his full name to players`);
        return plain(p ?? n);
      });
    }
    return s.data.players.slice(0, 1).map(plain);
  };
  const special = ((schedule as { special_weeks?: { legend: string; from: string; to: string }[] }).special_weeks ?? []).map((w) => ({
    legend: plain(w.legend),
    from: Date.parse(`${w.from}T00:00:00+08:00`),
    to: Date.parse(`${w.to}T23:59:59+08:00`),
  }));
  const upcoming = live.filter((s) => s.data.date.getTime() > now.getTime() - 7 * 86_400_000);
  const names = new Map(upcoming.map((s) => [s, featured(s)]));
  for (let i = 0; i < upcoming.length; i++) {
    for (let j = i + 1; j < upcoming.length; j++) {
      const [a, b] = [upcoming[i], upcoming[j]];
      if (b.data.date.getTime() - a.data.date.getTime() >= 7 * 86_400_000) break;
      if (b.data.date.getTime() < now.getTime()) continue;
      for (const name of names.get(a)!.filter((x) => names.get(b)!.includes(x))) {
        const ok = special.some((w) => (w.legend === name || name.endsWith(` ${w.legend}`)) && a.data.date.getTime() >= w.from && b.data.date.getTime() <= w.to);
        if (!ok) errors.push(`${pad(a.data.number)} and ${pad(b.data.number)} both feature ${name} within a week; move one (npm run hand-over gives a slot to another piece), or list a special week for him in data/schedule.json "special_weeks"`);
      }
    }
  }
}
// Reserved angles in the story bank: a returning subject must say "(follow-up of NNN)".
const bank = fs.readFileSync(path.join(ROOT, 'docs/story-bank.md'), 'utf8');
const subjects = new Map(stories.map((s) => [(s.data.format === 'quiz' && s.data.answer ? s.data.answer : s.data.title.split(' / ')[0]).replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase(), s.data.number]));
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
// "On this day" comparisons every third day from data/schedule.json on_this_day_from (owner, 25 Oct 2026).
if (schedule.on_this_day_from) {
  const start = Date.parse(`${schedule.on_this_day_from}T00:00:00+08:00`);
  const every = schedule.on_this_day_every ?? 3;
  for (const s of live) {
    const sgDay = Math.floor((s.data.date.getTime() + 8 * 3600e3 - (start + 8 * 3600e3)) / DAY);
    if (sgDay < 0 || s.data.date.getTime() < now.getTime()) continue;
    const due = sgDay % every === 0;
    if (s.data.format === 'quiz') continue; // checked below
    if (due && s.data.series !== 'On this day') warnings.push(`${pad(s.data.number)} (${new Date(s.data.date.getTime() + 8 * 3600e3).toISOString().slice(0, 10)}) is an "on this day" day; give the slot an "on this day" comparison and move this story to the end`);
    if (!due && s.data.series === 'On this day') warnings.push(`${pad(s.data.number)} is an "on this day" story outside the every-${every}-days rhythm`);
  }
}
// "Guess the legend" every 9 days from guess_the_legend_from (owner, 25 Oct 2026); on a comparison day it moves to the next day.
if (schedule.guess_the_legend_from) {
  const sgDate = (t: number) => new Date(t + 8 * 3600e3).toISOString().slice(0, 10);
  const otdStart = schedule.on_this_day_from ? Date.parse(`${schedule.on_this_day_from}T00:00:00+08:00`) : null;
  const isOtd = (day: string) => otdStart !== null && Math.round((Date.parse(`${day}T00:00:00+08:00`) - otdStart) / DAY) % (schedule.on_this_day_every ?? 3) === 0 && Date.parse(`${day}T00:00:00+08:00`) >= otdStart;
  const quizDays = new Set<string>();
  const qStart = Date.parse(`${schedule.guess_the_legend_from}T00:00:00+08:00`);
  for (let k = 0; k < 60; k++) {
    const day = sgDate(qStart + k * (schedule.guess_the_legend_every ?? 9) * DAY);
    quizDays.add(isOtd(day) ? sgDate(Date.parse(`${day}T00:00:00+08:00`) + DAY) : day);
  }
  for (const s of live) {
    if (s.data.date.getTime() < now.getTime()) continue;
    const day = sgDate(s.data.date.getTime());
    if (quizDays.has(day) && s.data.format !== 'quiz') warnings.push(`${pad(s.data.number)} (${day}) is a "Guess the legend" day; give the slot a quiz and move this story to the end`);
    if (!quizDays.has(day) && s.data.format === 'quiz') warnings.push(`${pad(s.data.number)} is a "Guess the legend" quiz outside the every-9-days rhythm`);
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
    const r = social.find((x) => x.number === s.data.number && x.network === 'facebook') as { status?: string; detail?: string; story?: string } | undefined;
    if (r && r.status === 'scheduled' && !r.story && s.data.date.getTime() > now.getTime()) {
      errors.push(`${pad(s.data.number)}: its Facebook record does not say which story it belongs to (it may still show the story this slot had before); run "Reels" with action replace and Dry run unticked for ${pad(s.data.number)}`);
    }
    // The slot was given to another story (e.g. an "on this day" comparison) but Facebook still holds the old story's post.
    if (r?.story && r.story !== s.data.slug && r.status !== 'posted' && s.data.date.getTime() > now.getTime()) {
      errors.push(`${pad(s.data.number)}: Facebook has "${r.story}" scheduled in the slot of "${s.data.slug}"; run "Reels" with action switch and Dry run unticked for ${pad(s.data.number)}`);
    } else if (usesReel(s.data.date) && s.data.date.getTime() > now.getTime() && r?.status === 'scheduled' && !r.detail?.includes(' reel ')) {
      warnings.push(`${pad(s.data.number)} is a Reel story but Facebook still has its picture post scheduled; run "Reels" with action switch`);
    } else if (usesReel(s.data.date) && s.data.date.getTime() > now.getTime() && r?.status === 'scheduled' && r.detail && !r.detail.includes(musicTag(s.data.number))
      && !(!r.detail.includes('(music:') && legacyMusicTag(s.data.number) === musicTag(s.data.number))) {
      warnings.push(`${pad(s.data.number)}'s Facebook Reel has other music than ${musicTag(s.data.number)}; run "Reels" with action switch`);
    }
    // A quiz Reel must open on the mystery card on Facebook, never on a frame of the answer.
    if (s.data.format === 'quiz' && s.data.date.getTime() > now.getTime() && r?.status === 'scheduled' && r.detail?.includes(' reel ') && !r.detail.includes('(cover: mystery card)')) {
      errors.push(`${pad(s.data.number)}: this quiz's Facebook Reel has no mystery-card cover, so Facebook may show the answer; run "Reels" with action replace and Dry run unticked for ${pad(s.data.number)}`);
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
