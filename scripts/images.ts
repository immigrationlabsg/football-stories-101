/**
 * Runs before every build (npm run prebuild):
 *  - responsive AVIF/WebP sizes of each story hero
 *  - the 1200x630 Open Graph image and the 1080x1350 Instagram carousel
 *  - the daily Reel (NNN-reel.mp4) for stories from data/schedule.json reels_from, up to 28 days ahead
 *  - the default share image
 *  - public/images/derived/manifest.json, read by the HeroImage component
 *
 * Everything is written to public/images/derived (gitignored) and is skipped
 * when the output is newer than its inputs, so repeated builds are quick.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { loadStories, PUBLIC_DIR, heroFile } from './lib/stories';
import { renderOg, renderIgCover, renderFbCard, renderIgFact, renderIgClose, renderDefault } from './lib/cards';
import { pad3, PLACEHOLDER_HERO } from '../src/schema/story';
import type { Manifest } from '../src/lib/image-manifest';
import { site, SITE_URL, SITE_BASE } from '../src/site.config';
import { endReelTools, renderReel, trackFor, usesReel } from './lib/reel';

const OUT = path.join(PUBLIC_DIR, 'images/derived');
const WIDTHS = [480, 800, 1200];
const SITE_LABEL = `${SITE_URL.replace(/^https?:\/\//, '')}${SITE_BASE === '/' ? '' : SITE_BASE}`;
const force = process.argv.includes('--force');

fs.mkdirSync(OUT, { recursive: true });

/**
 * Freshness is decided by content hashes, not file times, so a CI cache of
 * public/images/derived survives a fresh checkout. Hashes are kept in
 * manifest.json next to the images.
 */
function hashOf(...parts: (string | Buffer)[]): string {
  const h = crypto.createHash('sha1');
  for (const p of parts) h.update(p);
  return h.digest('hex');
}
let previous: Record<string, { hash?: string; cards?: string[] }> = {};
try {
  previous = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
} catch {
  previous = {};
}
function fresh(key: string, hash: string, files: string[]): boolean {
  if (force) return false;
  if (previous[key]?.hash !== hash) return false;
  return files.every((f) => fs.existsSync(f));
}

const { stories, errors } = loadStories();
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}

const manifest: Manifest = {};
// Reels are tracked in their own file: reels.json maps a story number to the hash its Reel was made from.
const REELS = path.join(OUT, 'reels.json');
let reelsPrev: Record<string, string> = {};
try {
  reelsPrev = JSON.parse(fs.readFileSync(REELS, 'utf8'));
} catch {
  reelsPrev = {};
}
const reels: Record<string, string> = {};
const reelMusic: Record<string, string> = {}; // published as reel-music.json: which track each Reel online carries
const reelStories: Record<string, string> = {}; // published as reel-stories.json: which story (slug) each Reel online shows
const reelSource = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'lib/reel.ts'));
const DAY = 86_400_000;
const reelFailures: string[] = [];
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.tmp.mp4')) fs.rmSync(path.join(OUT, f), { force: true }); // left by an interrupted render
const cardsScript = path.join(path.dirname(new URL(import.meta.url).pathname), 'lib/cards.ts');
const cardsSource = fs.readFileSync(cardsScript);
const widthsKey = WIDTHS.join(',');

for (const story of stories) {
  const n = pad3(story.data.number);
  const heroPath = heroFile(story);
  const placeholder = heroPath !== path.join(PUBLIC_DIR, story.data.hero.src);
  const hero = fs.readFileSync(heroPath);
  const meta = await sharp(hero).metadata();
  const width = meta.width ?? 1600;
  const height = meta.height ?? 1600;

  const widths = WIDTHS.filter((w) => w <= width);
  if (widths.length === 0) widths.push(width);
  const sizeFiles = widths.flatMap((w) => [path.join(OUT, `${n}-${w}.avif`), path.join(OUT, `${n}-${w}.webp`)]);

  const slides: Array<() => Promise<Buffer>> = [
    () => renderIgCover(story.data, hero),
    ...story.data.facts.map((fact, i) => () => renderIgFact(story.data, fact, i + 1, story.data.facts.length)),
    () => renderIgClose(story.data),
  ];
  const og = path.join(OUT, `${n}-og.png`);
  const fb = path.join(OUT, `${n}-fb.png`);
  const cardFiles = slides.map((_, i) => path.join(OUT, `${n}-ig-${String(i + 1).padStart(2, '0')}.png`));
  const cards = cardFiles.map((f) => `/images/derived/${path.basename(f)}`);

  // What the outputs depend on: the hero bytes, the fields that appear on cards, the renderer, the sizes.
  const hash = hashOf(
    hero,
    JSON.stringify({ number: story.data.number, title: story.data.title, dek: story.data.dek, hook: story.data.hook, question: story.data.question, facts: story.data.facts, site: SITE_LABEL }),
    cardsSource,
    widthsKey,
  );

  if (fresh(n, hash, [...sizeFiles, og, fb, ...cardFiles])) {
    console.log(`${n} ${story.data.slug}: up to date`);
  } else {
    for (const w of widths) {
      await sharp(hero).resize(w).avif({ quality: 55, effort: 3 }).toFile(path.join(OUT, `${n}-${w}.avif`));
      await sharp(hero).resize(w).webp({ quality: 78 }).toFile(path.join(OUT, `${n}-${w}.webp`));
    }
    fs.writeFileSync(og, await renderOg(story.data, hero));
    fs.writeFileSync(fb, await renderFbCard(story.data, hero));
    for (let i = 0; i < slides.length; i++) fs.writeFileSync(cardFiles[i], await slides[i]());
    console.log(`${n} ${story.data.slug}: ${widths.length} sizes, og, ${cards.length} carousel cards`);
  }
  // The Reel: only for stories that post as Reels, from two days ago to 28 days ahead (Facebook schedules 27 days out).
  const reel = path.join(OUT, `${n}-reel.mp4`);
  const t = story.data.date.getTime();
  if (!story.data.draft && usesReel(story.data.date) && t > Date.now() - 2 * DAY && t < Date.now() + 28 * DAY) {
    const track = trackFor(story.data.number);
    const reelHash = hashOf(hash, fs.readFileSync(track), reelSource);
    if (!force && reelsPrev[n] === reelHash && fs.existsSync(reel)) console.log(`${n} reel: up to date`);
    else {
      const started = Date.now();
      try {
        await renderReel(cardFiles, track, reel);
        console.log(`${n} reel: made with ${path.basename(track)} in ${Math.round((Date.now() - started) / 1000)}s`);
        reels[n] = reelHash;
        reelMusic[n] = path.basename(track, '.m4a');
        reelStories[n] = story.data.slug;
      } catch (e) {
        reelFailures.push(`${n}: ${(e as Error).message.slice(0, 300)}`);
        fs.rmSync(`${reel}.tmp.mp4`, { force: true });
      }
    }
    if (reelsPrev[n] === reelHash && fs.existsSync(reel)) {
      reels[n] = reelHash;
      reelMusic[n] = path.basename(track, '.m4a');
      reelStories[n] = story.data.slug;
    }
  } else if (fs.existsSync(reel)) fs.unlinkSync(reel);
  // Remove stale slides from a previous, longer facts list
  for (const f of fs.readdirSync(OUT)) {
    if (f.startsWith(`${n}-ig-`) && !cards.includes(`/images/derived/${f}`)) fs.unlinkSync(path.join(OUT, f));
  }

  manifest[n] = { src: placeholder ? PLACEHOLDER_HERO : story.data.hero.src, width, height, widths, cards, og: `/images/derived/${n}-og.png`, hash };
}

const def = path.join(PUBLIC_DIR, 'images/default-share.png');
if (force || !fs.existsSync(def)) fs.writeFileSync(def, await renderDefault(site.tagline));

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(REELS, JSON.stringify(reels, null, 2));
fs.writeFileSync(path.join(OUT, 'reel-music.json'), JSON.stringify(reelMusic, null, 2));
fs.writeFileSync(path.join(OUT, 'reel-stories.json'), JSON.stringify(reelStories, null, 2));
await endReelTools();
if (reelFailures.length) {
  // Fail the build so GitHub emails the owner; everything else above is already written and cached.
  for (const f of reelFailures) console.error(`error: Reel ${f}`);
  process.exit(1);
}
console.log(`manifest written for ${Object.keys(manifest).length} stories`);
