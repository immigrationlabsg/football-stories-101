/**
 * Makes a finished painting a story's live hero: converts design/paintings/NNN.png
 * to the story's hero image, and rewrites the hero credit, link and alt text in the story file.
 * The credit is built from the reference photo's licence in design/references/README.md.
 *
 *   npm run publish-painting -- 10 11 12     (alt text comes from "alt" in data/reference-photos.json)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, STORIES_DIR } from './lib/stories';

const AI = 'Image generated with AI.';
const refs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference-photos.json'), 'utf8')) as Record<string, { commons: string | null; alt?: string }[]>;
const readme = fs.readFileSync(path.join(ROOT, 'design/references/README.md'), 'utf8').split('\n');
const heroSources = path.join(ROOT, 'data/hero-sources.json');

for (const arg of process.argv.slice(2)) {
  const n = arg.padStart(3, '0');
  const ref = refs[n]?.[0];
  if (!ref?.alt) throw new Error(`${n}: add an "alt" to its first entry in data/reference-photos.json`);
  const file = fs.readdirSync(STORIES_DIR).find((f) => f.startsWith(`${n}-`) && f.endsWith('.mdx'));
  if (!file) throw new Error(`${n}: no story file`);
  const story = { path: path.join(STORIES_DIR, file) };
  const heroSrc = (/^\s+src:\s*"([^"]+)"/m.exec(fs.readFileSync(story.path, 'utf8')) ?? [])[1];
  if (!heroSrc) throw new Error(`${n}: story has no hero src`);
  await sharp(path.join(ROOT, `design/paintings/${n}.png`)).resize(1440, 1440).jpeg({ quality: 90 }).toFile(path.join(ROOT, 'public', heroSrc));

  let credit = `Illustration: Football Stories 101. ${AI}`;
  let url = '';
  if (ref.commons) {
    const row = readme.find((l) => l.startsWith(`| ${n}-1.jpg `));
    const [, , , licence, who, link] = (row ?? '').split('|').map((c) => c.trim());
    url = (/\((https:[^\s]+)\)$/.exec(link ?? '') ?? [])[1] ?? '';
    const named = who && !/^unknown/i.test(who) ? who : '';
    credit = /cc by/i.test(licence ?? '')
      ? `Painting after a photo by ${named || 'a Wikimedia Commons contributor'}, ${licence}, via Wikimedia Commons. ${AI}`
      : `Painting after ${named ? `a photo by ${named}` : 'a public-domain photo'}${/cc0/i.test(licence ?? '') ? ', CC0' : ''}, via Wikimedia Commons. ${AI}`;
  }
  let text = fs.readFileSync(story.path, 'utf8');
  text = text.replace(/ {2}creditUrl: .*\n/, '').replace(/ {2}commons: .*\n/, '');
  text = text.replace(/ {2}alt: .*\n/, `  alt: ${JSON.stringify(ref.alt)}\n`);
  text = text.replace(/ {2}credit: .*\n/, `${url ? `  creditUrl: ${JSON.stringify(url)}\n` : ''}  credit: ${JSON.stringify(credit)}\n`);
  fs.writeFileSync(story.path, text);
  if (fs.existsSync(heroSources)) {
    const h = JSON.parse(fs.readFileSync(heroSources, 'utf8'));
    delete h[n];
    fs.writeFileSync(heroSources, JSON.stringify(h, null, 2) + '\n');
  }
  console.log(`${n}: live. ${credit}`);
}
