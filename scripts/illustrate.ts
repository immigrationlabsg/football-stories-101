/**
 * Turns a photo into a flat, inked "illustration" for a story hero
 * (route 1: free, runs locally, same look on every story).
 *
 *   npx tsx scripts/illustrate.ts <input-photo> <output.jpg> [--size 1600]
 *
 * Steps: soften detail, flatten colour into a few tones, warm the palette,
 * draw ink outlines from the edges, lay it on cream paper texture.
 * Only use photos you are allowed to use: Wikimedia Commons with a free
 * licence (credit it), your own, or licensed. Never a Google image result.
 */
import sharp from 'sharp';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: tsx scripts/illustrate.ts <input> <output.jpg> [--size 1600]');
  process.exit(1);
}
const sizeArg = process.argv.indexOf('--size');
const SIZE = sizeArg > -1 ? Number(process.argv[sizeArg + 1]) : 1600;
const LEVELS = 6; // tones per channel

const base = sharp(input).rotate().resize(SIZE, SIZE, { fit: 'cover', position: 'attention' });

// 1. Flattened colour: blur away detail, then posterise each channel.
const { data: flat, info } = await base
  .clone()
  .median(7)
  .blur(1.2)
  .modulate({ saturation: 1.15, brightness: 1.03 })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const step = 255 / (LEVELS - 1);
const warm = [1.04, 1.0, 0.92]; // nudge towards a watercolour cream
for (let i = 0; i < flat.length; i++) {
  const c = i % 3;
  const q = Math.round(flat[i] / step) * step;
  flat[i] = Math.max(0, Math.min(255, q * warm[c] + 12));
}

// 2. Ink lines: edges of a softened greyscale copy, thresholded and thickened.
const edges = await base
  .clone()
  .greyscale()
  .median(5)
  .convolve({ width: 3, height: 3, kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1] })
  .linear(3.2, 0)
  .threshold(70)
  .negate()
  .blur(0.6)
  .raw()
  .toBuffer();

// 3. Multiply ink over colour.
const out = Buffer.alloc(flat.length);
for (let p = 0; p < SIZE * SIZE; p++) {
  const ink = edges[p] / 255; // 1 = paper, 0 = line
  for (let c = 0; c < 3; c++) {
    const i = p * 3 + c;
    out[i] = Math.round(flat[i] * (0.25 + 0.75 * ink));
  }
}

// 4. Paper grain.
const noise = Buffer.alloc(SIZE * SIZE * 3);
for (let i = 0; i < noise.length; i += 3) {
  const n = 236 + Math.floor(Math.random() * 20);
  noise[i] = n; noise[i + 1] = n - 3; noise[i + 2] = n - 12;
}
const paper = await sharp(noise, { raw: { width: SIZE, height: SIZE, channels: 3 } }).blur(0.8).png().toBuffer();

await sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } })
  .composite([{ input: paper, blend: 'multiply' }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile(output);
console.log(`wrote ${output}`);
