/**
 * Gives a scheduled slot to a new story (an "on this day" comparison or a "Guess the legend" quiz) and moves the story
 * that had it to the end of the queue (owner, 25 Oct 2026). Nothing is posted; afterwards push, wait until the site
 * shows the new Reel, and run the Reels workflow (action switch) for the slot if Facebook already has a post for it.
 *
 *   npm run hand-over -- <slot number> <new story .mdx> <its fact-check .md>
 *
 * The new story keeps the slot's number and date (so its music and Reel file are the slot's). The old story gets the next
 * free number and the day after the last scheduled story; its fact-check log, reference-photo entries and story-bank
 * row move with it, and reserved story-bank rows from that number on shift down by one.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { loadStories, ROOT, STORIES_DIR } from './lib/stories';
import { pad3, storySchema } from '../src/schema/story';

const [slotArg, newFile, newLog] = process.argv.slice(2);
const slot = Number(slotArg);
if (!slot || !newFile || !newLog) throw new Error('Usage: npm run hand-over -- <slot number> <new story .mdx> <its fact-check .md>');
const DAY = 86_400_000;
// Log headers come as "# Fact-check log: 005 ", "# Fact-check: 023 " and "# Fact-check 001: "; all become "Fact-check log: NNN".
const LOG_HEADER = /^# Fact-check(?: log)?:? (?:\d{3}|NNN):? /m;
for (const f of [newFile, newLog]) if (!fs.existsSync(f)) throw new Error(`${f} does not exist`);
if (!LOG_HEADER.test(fs.readFileSync(newLog, 'utf8'))) throw new Error(`${newLog} has no "# Fact-check log: NNN" header`);

const { stories, errors } = loadStories();
if (errors.length) throw new Error(`Fix the stories first:\n${errors.join('\n')}`);
const old = stories.find((s) => s.data.number === slot);
if (!old) throw new Error(`No story ${pad3(slot)}`);
if (old.data.date.getTime() < Date.now() + 15 * 60e3) throw new Error(`${pad3(slot)} is due too soon (or already out) to hand over`);
const sent = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sent.json'), 'utf8'));
if ((sent.social ?? []).some((r: { number: number; status?: string }) => r.number === slot && r.status === 'posted')) {
  throw new Error(`${pad3(slot)} has already been posted somewhere; it cannot be handed over`);
}

// The new story must be valid before anything moves, or the calendar would be left with a hole.
const parsed = matter(fs.readFileSync(newFile, 'utf8'));
parsed.data.number = slot;
parsed.data.date = old.data.date;
const checked = storySchema.safeParse(parsed.data);
if (!checked.success) throw new Error(`${newFile}: ${checked.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
if (stories.some((s) => s.data.slug === parsed.data.slug)) throw new Error(`a story with the slug ${parsed.data.slug} already exists`);

// Where the old story goes: the next free number, the day after the last scheduled story, at that day's slot time.
const live = stories.filter((s) => !s.data.draft).sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
const lastDay = live.at(-1)!.data.date;
const sgMidnight = Date.parse(`${new Date(lastDay.getTime() + 8 * 3600e3).toISOString().slice(0, 10)}T00:00:00+08:00`) + DAY;
const weekend = [0, 6].includes(new Date(sgMidnight + 8 * 3600e3).getUTCDay());
const newDate = new Date(sgMidnight + (weekend ? 10 : 8) * 3600e3).toISOString().replace('.000Z', 'Z');
const to = Math.max(...stories.map((s) => s.data.number)) + 1;
const [from3, to3] = [pad3(slot), pad3(to)];

const DATA_FILES = ['data/reference-photos.json', 'data/reference-queries.json'];
for (const f of DATA_FILES) {
  if (JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'))[to3]) throw new Error(`${f} already has an entry ${to3}; move or remove it first`);
}
if (fs.existsSync(path.join(ROOT, 'docs/fact-checks', `${to3}.md`))) throw new Error(`docs/fact-checks/${to3}.md already exists`);

// 1. Move the old story, its fact-check log and its data entries.
const oldPath = path.join(STORIES_DIR, old.file);
const movedPath = path.join(STORIES_DIR, old.file.replace(/^\d{3}-/, `${to3}-`));
let text = fs.readFileSync(oldPath, 'utf8');
text = text.replace(/^number: \d+$/m, `number: ${to}`).replace(/^date: .+$/m, `date: ${newDate}`);
fs.writeFileSync(movedPath, text);
fs.rmSync(oldPath);
const logFrom = path.join(ROOT, 'docs/fact-checks', `${from3}.md`);
if (fs.existsSync(logFrom)) {
  const log = fs.readFileSync(logFrom, 'utf8').replace(LOG_HEADER, `# Fact-check log: ${to3} `);
  fs.writeFileSync(path.join(ROOT, 'docs/fact-checks', `${to3}.md`), log);
}
for (const f of DATA_FILES) {
  const file = path.join(ROOT, f);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (data[from3]) {
    data[to3] = data[from3];
    delete data[from3];
  }
  fs.writeFileSync(file, JSON.stringify(Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n');
}
// Stories that follow up the moved one now point at its new number (the new story in the slot is a different subject).
for (const f of fs.readdirSync(STORIES_DIR).filter((f) => f.endsWith('.mdx'))) {
  const p = path.join(STORIES_DIR, f);
  const t = fs.readFileSync(p, 'utf8');
  const u = t.replace(new RegExp(`^followUpOf: 0*${slot}$`, 'm'), `followUpOf: ${to}`);
  if (u !== t) fs.writeFileSync(p, u);
}

// 2. Install the new story in the slot (number and date are the slot's, whatever the file says; checked before step 1).
const newText = fs
  .readFileSync(newFile, 'utf8')
  .replace(/^number: .+$/m, `number: ${slot}`)
  .replace(/^date: .+$/m, `date: ${old.data.date.toISOString().replace('.000Z', 'Z')}`);
fs.writeFileSync(path.join(STORIES_DIR, `${from3}-${parsed.data.slug}.mdx`), newText);
fs.writeFileSync(logFrom, fs.readFileSync(newLog, 'utf8').replace(LOG_HEADER, `# Fact-check log: ${from3} `));

// 3. The story bank: the old row moves to its new number, reserved rows from there shift by one, the slot gets the new story.
const bankFile = path.join(ROOT, 'docs/story-bank.md');
const lines = fs.readFileSync(bankFile, 'utf8').split('\n');
const row = (n: string) => lines.findIndex((l) => l.startsWith(`| ${n} |`));
const oldRow = row(from3);
// The title already starts with the series for quizzes ("Guess the legend / ..."); say the kind only when it does not.
const kind = parsed.data.format === 'quiz' ? 'Guess the legend' : 'On this day';
const label = parsed.data.title.toLowerCase().startsWith(kind.toLowerCase()) ? parsed.data.title : `${kind}: ${parsed.data.title}`;
const movedRow = oldRow >= 0 ? lines[oldRow].replace(`| ${from3} |`, `| ${to3} |`).replace(/ \(moved from \d{3}\)/g, '').replace(/ \| (scheduled|drafted) \|$/, ` (moved from ${from3}) | scheduled |`) : null;
// Follow-ups that pointed at the old story's number now point at its new one.
for (let i = 0; i < lines.length; i++) lines[i] = lines[i].replace(new RegExp(`\\(follow-up of ${from3}([;)])`), `(follow-up of ${to3}$1`);
if (oldRow >= 0) lines[oldRow] = `| ${from3} | ${parsed.data.pillar[0].toUpperCase()}${parsed.data.pillar.slice(1)} | ${label} | scheduled |`;
for (let i = 0; i < lines.length; i++) {
  const m = /^\| (\d{3}) \|(.*\| reserved \|)$/.exec(lines[i]);
  if (m && Number(m[1]) >= to) lines[i] = `| ${pad3(Number(m[1]) + 1)} |${m[2]}`;
}
if (movedRow) {
  const before = lines.findIndex((l) => /^\| \d{3} \|/.test(l) && Number(l.slice(2, 5)) > to);
  lines.splice(before >= 0 ? before : lines.length, 0, movedRow);
}
fs.writeFileSync(bankFile, lines.join('\n'));

console.log(`${from3} is now "${parsed.data.title}" (${old.data.date.toISOString()})`);
console.log(`${old.data.slug} moved to ${to3} on ${newDate}`);
const fb = (sent.social ?? []).find((r: { number: number; network: string }) => r.number === slot && r.network === 'facebook');
if (fb) console.log(`Facebook already has ${from3} scheduled (${fb.story ?? 'unknown story'}): push, then run Reels switch ${slot} once the site shows the new Reel.`);
