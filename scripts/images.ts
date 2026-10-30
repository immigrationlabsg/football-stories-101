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
import { renderLineup } from './lib/lineup-card';
import { MYSTERY_COVER, renderQuizCover, renderQuizClue, renderQuizReveal, renderQuizClose } from './lib/quiz-cards';
import { pad3, PLACEHOLDER_HERO } from '../src/schema/story';
import type { Manifest } from '../src/lib/image-manifest';
import { site, SITE_URL, SITE_BASE } from '../src/site.config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';
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
/**
 * A two-player painting ("Baggio v Messi") framed whole at the card's shape on its own paper colour (its lightest
 * corner), so the share card and the Facebook picture never crop it down to one player. The same paper rule as the quiz
 * reveal in quiz-cards.ts; it lives here because a change to that file (or cards.ts) re-renders every Reel.
 */
async function wholeFor(img: Buffer, w: number, h: number): Promise<Buffer> {
  const { width = 1024, height = 1024 } = await sharp(img).metadata();
  const corners = await Promise.all(
    [[0, 0], [width - 16, 0], [0, height - 16], [width - 16, height - 16]].map(async ([left, top]) =>
      (await sharp(await sharp(img).extract({ left, top, width: 16, height: 16 }).toBuffer()).stats()).channels.slice(0, 3).map((c) => c.mean),
    ),
  );
  const [r, g, b] = corners.reduce((best, c) => (c[0] + c[1] + c[2] > best[0] + best[1] + best[2] ? c : best)).map(Math.round);
  return sharp(img).resize(w * 2, h * 2, { fit: 'contain', background: { r, g, b } }).jpeg({ quality: 90 }).toBuffer();
}
const SHARE_FRAMING = 'pairs whole, 26 Oct 2026';
/**
 * The music clips are 25 s, enough for the usual 7 cards (23.4 s). A Reel with an extra card (the Legendary XI) runs
 * longer, so its clip is slowed just enough to last (pitch kept), and the fade-out in reel.ts still lands on the music.
 * Done here, not in reel.ts, because a change to reel.ts would re-make (and need re-uploading) every scheduled Reel.
 */
const REEL_SECONDS = (cards: number) => 3 + 4 * (cards - 1) - 0.6 * (cards - 1);
const TRACK_SECONDS = 25;
const STRETCH = 'atempo to reel length + 0.5 s, 30 Oct 2026';
async function musicFor(track: string, cards: number, out: string): Promise<string> {
  const need = REEL_SECONDS(cards) + 0.5;
  if (need <= TRACK_SECONDS) return track;
  if (!ffmpegPath) throw new Error('ffmpeg is not available on this machine');
  await promisify(execFile)(ffmpegPath, ['-y', '-loglevel', 'error', '-i', track, '-filter:a', `atempo=${(TRACK_SECONDS / need).toFixed(4)}`, '-c:a', 'aac', '-b:a', '192k', out]);
  return out;
}

let previous: Record<string, { hash?: string; cards?: string[]; share?: string }> = {};
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
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.tmp.mp4') || f.endsWith('.tmp.m4a')) fs.rmSync(path.join(OUT, f), { force: true }); // left by an interrupted render
const cardsScript = path.join(path.dirname(new URL(import.meta.url).pathname), 'lib/cards.ts');
const cardsSource = fs.readFileSync(cardsScript);
const lineupSource = fs.readFileSync(path.join(path.dirname(cardsScript), 'lineup-card.ts'));
const quizCardsSource = fs.readFileSync(path.join(path.dirname(cardsScript), 'quiz-cards.ts'));
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

  // A "Guess the legend" quiz: mystery cover, the clues, the reveal and the share card (scripts/lib/quiz-cards.ts).
  const quiz = story.data.format === 'quiz';
  const mystery = quiz ? fs.readFileSync(MYSTERY_COVER) : null;
  const slides: Array<() => Promise<Buffer>> = quiz
    ? [
        () => renderQuizCover(story.data, mystery!),
        ...story.data.clues.map((_, i) => () => renderQuizClue(story.data, i + 1)),
        () => renderQuizReveal(story.data, hero),
        () => renderQuizClose(),
      ]
    : [
        () => renderIgCover(story.data, hero),
        ...story.data.facts.map((fact, i) => () => renderIgFact(story.data, fact, i + 1, story.data.facts.length)),
        ...(story.data.lineup ? [() => renderLineup(story.data)] : []),
        () => renderIgClose(story.data),
      ];
  const og = path.join(OUT, `${n}-og.png`);
  const fb = path.join(OUT, `${n}-fb.png`);
  const cardFiles = slides.map((_, i) => path.join(OUT, `${n}-ig-${String(i + 1).padStart(2, '0')}.png`));
  const cards = cardFiles.map((f) => `/images/derived/${path.basename(f)}`);

  // What the outputs depend on: the hero bytes, the fields that appear on cards, the renderer, the sizes.
  const hash = hashOf(
    hero,
    JSON.stringify({ number: story.data.number, title: story.data.title, dek: story.data.dek, hook: story.data.hook, question: story.data.question, facts: story.data.facts, site: SITE_LABEL,
      ...(quiz ? { clues: story.data.clues, answer: story.data.answer } : {}), ...(story.data.lineup ? { lineup: story.data.lineup } : {}) }),
    cardsSource,
    ...(story.data.lineup ? [lineupSource] : []),
    ...(quiz ? [quizCardsSource, mystery!] : []),
    widthsKey,
  );

  if (fresh(n, hash, [...sizeFiles, og, fb, ...cardFiles])) {
    console.log(`${n} ${story.data.slug}: up to date`);
  } else {
    for (const w of widths) {
      await sharp(hero).resize(w).avif({ quality: 55, effort: 3 }).toFile(path.join(OUT, `${n}-${w}.avif`));
      await sharp(hero).resize(w).webp({ quality: 78 }).toFile(path.join(OUT, `${n}-${w}.webp`));
    }
    for (let i = 0; i < slides.length; i++) fs.writeFileSync(cardFiles[i], await slides[i]());
    console.log(`${n} ${story.data.slug}: ${widths.length} sizes, ${cards.length} carousel cards`);
  }
  // The share card (og) and the Facebook picture have their own key: framing them differently re-renders only these two.
  const pair = story.data.series === 'On this day' && / v /.test(story.data.title.split(' / ')[0]);
  const share = hashOf(hash, pair ? SHARE_FRAMING : '');
  if (force || previous[n]?.share !== share || !fs.existsSync(og) || !fs.existsSync(fb)) {
    fs.writeFileSync(og, await renderOg(story.data, pair ? await wholeFor(hero, 500, 630) : hero));
    fs.writeFileSync(fb, await renderFbCard(story.data, pair ? await wholeFor(hero, 1080, 776) : hero));
    console.log(`${n} ${story.data.slug}: og and Facebook picture${pair ? ' (both players whole)' : ''}`);
  }
  // The Reel: only for stories that post as Reels, from two days ago to 28 days ahead (Facebook schedules 27 days out).
  const reel = path.join(OUT, `${n}-reel.mp4`);
  const t = story.data.date.getTime();
  if (!story.data.draft && usesReel(story.data.date) && t > Date.now() - 2 * DAY && t < Date.now() + 28 * DAY) {
    const track = trackFor(story.data.number);
    const reelHash = hashOf(hash, fs.readFileSync(track), reelSource, ...(REEL_SECONDS(cardFiles.length) + 0.5 > TRACK_SECONDS ? [STRETCH] : []));
    if (!force && reelsPrev[n] === reelHash && fs.existsSync(reel)) console.log(`${n} reel: up to date`);
    else {
      const started = Date.now();
      try {
        await renderReel(cardFiles, await musicFor(track, cardFiles.length, path.join(OUT, `${n}-music.tmp.m4a`)), reel);
        fs.rmSync(path.join(OUT, `${n}-music.tmp.m4a`), { force: true });
        console.log(`${n} reel: made with ${path.basename(track)} in ${Math.round((Date.now() - started) / 1000)}s`);
        reels[n] = reelHash;
        reelMusic[n] = path.basename(track, '.m4a');
        reelStories[n] = story.data.slug;
      } catch (e) {
        reelFailures.push(`${n}: ${(e as Error).message.slice(0, 300)}`);
        fs.rmSync(`${reel}.tmp.mp4`, { force: true });
        fs.rmSync(path.join(OUT, `${n}-music.tmp.m4a`), { force: true });
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

  manifest[n] = { src: placeholder ? PLACEHOLDER_HERO : story.data.hero.src, width, height, widths, cards, og: `/images/derived/${n}-og.png`, hash, share };
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
