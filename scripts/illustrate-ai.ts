/**
 * Generates the watercolour hero for every story that has a `hero.prompt`
 * but no image file yet. Runs on GitHub's servers (workflow "Illustrate"),
 * using Pollinations (https://pollinations.ai): free, no account, no key.
 *
 *   npx tsx scripts/illustrate-ai.ts [--only 7] [--redo 7]
 *
 *   --only N   generate just story N (if missing)
 *   --redo N   regenerate story N even if it exists (new seed)
 *
 * Free-tier limits: one image at a time, about one every 45 seconds,
 * 768x768 at most, with a small logo in a corner. We crop the corner off
 * and upscale to 1440x1440. To change the look of every illustration, edit
 * STYLE below; to change one, edit that story's hero.prompt.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadStories, PUBLIC_DIR } from './lib/stories';
import { pad3 } from '../src/schema/story';

/** Put first: image models weight the start of a prompt most. */
export const STYLE =
  'Watercolour painting on cold-press paper, loose wet brushstrokes, soft bleeding washes, fine ink linework, ' +
  'muted earthy palette with warm cream highlights, white paper showing at the edges, vintage magazine illustration';

/** Put last: object-led scenes avoid the faces and shirt lettering free models get wrong. */
export const COMPOSITION = 'quiet evocative still life, painterly and impressionistic, generous empty paper around the subject';

const GAP_MS = 50_000;
const SIZE = 768;
const CROP = 704; // drop the bottom and right edges where the service puts its mark
const OUT = 1440;

const args = process.argv.slice(2);
const only = args.includes('--only') ? Number(args[args.indexOf('--only') + 1]) : null;
const redo = args.includes('--redo') ? Number(args[args.indexOf('--redo') + 1]) : null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MODELS = ['flux', ''];

async function fetchImage(prompt: string, seed: number): Promise<Buffer> {
  for (const model of MODELS) {
    try {
      return await fetchWith(prompt, seed, model);
    } catch (e) {
      console.warn(`  model "${model || 'default'}" failed: ${(e as Error).message}`);
    }
  }
  throw new Error('no model returned an image');
}

async function fetchWith(prompt: string, seed: number, model: string): Promise<Buffer> {
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${SIZE}&height=${SIZE}&seed=${seed}&nologo=true&safe=true${model ? `&model=${model}` : ''}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': 'football-stories-101' } });
    if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) {
      return Buffer.from(await res.arrayBuffer());
    }
    const wait = Number(res.headers.get('retry-after') ?? 0) * 1000 || GAP_MS * attempt;
    console.warn(`  attempt ${attempt}: HTTP ${res.status}; waiting ${Math.round(wait / 1000)}s`);
    await sleep(wait);
  }
  throw new Error('image service did not return an image after 3 attempts');
}

const { stories, errors } = loadStories();
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}

const todo = stories.filter((s) => {
  if (!s.data.hero.prompt) return false;
  if (only !== null && s.data.number !== only) return false;
  if (redo !== null) return s.data.number === redo;
  return !fs.existsSync(path.join(PUBLIC_DIR, s.data.hero.src));
});

if (todo.length === 0) {
  console.log('Every story with a prompt already has its illustration.');
  process.exit(0);
}
console.log(`${todo.length} illustration(s) to generate.`);

let made = 0;
for (const [i, s] of todo.entries()) {
  const dest = path.join(PUBLIC_DIR, s.data.hero.src);
  const seed = redo !== null ? Math.floor(Math.random() * 1e6) : 1000 + s.data.number;
  const prompt = `${STYLE}. ${s.data.hero.prompt}. ${COMPOSITION}`;
  console.log(`[${pad3(s.data.number)}] ${s.data.slug}`);
  try {
    const raw = await fetchImage(prompt, seed);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await sharp(raw)
      .extract({ left: 0, top: 0, width: CROP, height: CROP })
      .resize(OUT, OUT, { kernel: 'lanczos3' })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(dest);
    made++;
    console.log(`  saved ${path.relative(process.cwd(), dest)}`);
  } catch (e) {
    console.error(`  failed: ${(e as Error).message}. The placeholder stays until the next run.`);
  }
  if (i < todo.length - 1) await sleep(GAP_MS);
}
console.log(`${made} of ${todo.length} generated.`);
