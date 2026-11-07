/**
 * Narrated Reels (owner, 8 Nov 2026).
 *   npm run narration -- plan 5     Writes assets/narration/NNN/lines.json for the next 5 unnarrated stories, soonest first,
 *                                   and prints their spoken lines for the voice step.
 *   npm run narration -- status     What is finished, what is waiting for its voice, and what is left.
 *   npm run narration -- test 024 <folder>   Renders those Reels into a folder, with the cards from the live site, to check before pushing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadStories } from './lib/stories';
import { NARRATION_DIR, narrationFor, needsNarration, renderNarratedReel, type NarrationLine } from './lib/narration';
import { endReelTools, trackFor } from './lib/reel';
import { pad3 } from '../src/schema/story';

export const VOICE = 'b847bc29-f184-583a-8ad9-d1f1e16d1a60';
const WORDS = ['nil', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** Reads as written, except what a voice would stumble on. Never adds a fact: each line is the card's own text. */
export function spoken(t: string): string {
  return t
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\b(\d{4})[–-](\d{2})\b/g, '$1 to $2')
    .replace(/\b(\d{1,2})[–-](\d{1,2})\b/g, (_, a, b) => (a === b ? `${WORDS[+a] ?? a} all` : `${WORDS[+a] ?? a} ${WORDS[+b] ?? b}`))
    .replace(/\s+/g, ' ')
    .trim();
}
function linesFor(d: any): NarrationLine[] {
  const texts: string[] =
    d.format === 'quiz'
      ? [d.hook, ...d.clues, `It's ${d.answer}.`, d.question]
      : [d.hook, ...d.facts, ...(d.lineup ? ['The Legendary Eleven.'] : []), d.question];
  return texts.map((text, card) => ({ card, text: spoken(String(text)) }));
}
const [action, count, folder] = process.argv.slice(2);
const all = loadStories().stories.filter((s) => !s.data.draft && !s.data.narratedReel && needsNarration(s.data.date) && s.data.date.getTime() > Date.now() - 3600e3).sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
const left = all; // a story is finished once it has its picture Reel (narratedReel)
if (action === 'status') {
  console.log(`left without a picture Reel ${left.length}: ${left.map((s) => pad3(s.data.number)).join(' ')}`);
} else if (action === 'plan') {
  for (const s of left.slice(0, Number(count || 5))) {
    const n = pad3(s.data.number);
    const dir = path.join(NARRATION_DIR, n);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'lines.json');
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ voice: VOICE, lines: linesFor(s.data) }, null, 2) + '\n');
    console.log(`\n${n} ${s.data.date.toISOString()} ${s.data.slug}`);
    JSON.parse(fs.readFileSync(file, 'utf8')).lines.forEach((l: NarrationLine, i: number) => console.log(`  ${i}: ${l.text}`));
  }
} else if (action === 'test') {
  const v = narrationFor(count);
  if (!v || !folder) throw new Error(`Usage: npm run narration -- test <NNN> <folder>; ${count} needs lines.json and every clip`);
  fs.mkdirSync(folder, { recursive: true });
  const cards: string[] = [];
  for (let i = 1; i <= v.narration.lines.length; i++) {
    const name = `${count}-ig-${String(i).padStart(2, '0')}.png`;
    const file = path.join(folder, name);
    const r = await fetch(`https://immigrationlabsg.github.io/football-stories-101/images/derived/${name}`);
    if (!r.ok) throw new Error(`${name}: site answered ${r.status}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    cards.push(file);
  }
  const seconds = await renderNarratedReel(cards, v.clips, v.narration.lines, trackFor(Number(count)), path.join(folder, `${count}.mp4`));
  console.log(`${count}: ${path.basename(trackFor(Number(count)))}, ${seconds.toFixed(1)} s, ${path.join(folder, `${count}.mp4`)}`);
  await endReelTools();
} else throw new Error('Usage: npm run narration -- plan <count> | status | test <NNN> <folder>');
