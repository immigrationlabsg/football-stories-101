/**
 * Colourises the black-and-white reference photos in design/references/ with
 * OpenAI's GPT Image API, so the watercolour step starts from a photo whose
 * colours are already decided. Colour photos are left alone.
 *
 *   design/references/colour/NNN-K.jpg   (colourised copy of NNN-K.jpg)
 *
 * The original stays where it is. The paint script uses the colour copy when it exists.
 * Runs on GitHub's servers (workflow "Colourise references"), which holds OPENAI_API_KEY.
 *
 *   npm run colourise              every black-and-white photo
 *   npm run colourise -- 2 3 4     only these stories
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/stories';

type Ref = { why: string };
const refs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference-photos.json'), 'utf8')) as Record<string, Ref[]>;
const DIR = path.join(ROOT, 'design/references');
const OUT = path.join(DIR, 'colour');
const KEY = process.env.OPENAI_API_KEY;
const QUALITY = process.env.QUALITY || 'medium';
const only = process.argv.slice(2).map((n) => n.padStart(3, '0'));
if (!KEY) throw new Error('OPENAI_API_KEY is not set. Add it as a repository secret (see docs/runbook.md, section 13).');
fs.mkdirSync(OUT, { recursive: true });

/** Mean HSV saturation on a 0-255 scale; black-and-white and sepia scans come out under 25. */
async function saturation(file: string): Promise<number> {
  const { data, info } = await sharp(file).resize(120, 120, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    sum += max ? ((max - min) / max) * 255 : 0;
  }
  return sum / (data.length / info.channels);
}

for (const file of fs.readdirSync(DIR).filter((f) => /^\d{3}-\d\.jpg$/.test(f)).sort()) {
  const n = file.slice(0, 3);
  if (only.length && !only.includes(n)) continue;
  const target = path.join(OUT, file);
  if (fs.existsSync(target)) continue;
  const sat = await saturation(path.join(DIR, file));
  if (sat >= 25) {
    console.log(`${file}: already colour (${Math.round(sat)}), skipped`);
    continue;
  }
  const meta = await sharp(path.join(DIR, file)).metadata();
  const ratio = (meta.width ?? 1) / (meta.height ?? 1);
  const size = ratio > 1.2 ? '1536x1024' : ratio < 0.83 ? '1024x1536' : '1024x1024';
  const why = refs[n]?.[Number(file[4]) - 1]?.why ?? '';
  const prompt =
    'Colourise this black-and-white photograph so it looks like a real colour photograph of the same moment. ' +
    'Use natural, period-correct colours for the clubs, national teams, kits, skin, grass and surroundings. ' +
    'Change nothing else: keep the exact composition, framing, crop, faces, expressions, poses, crests, logos, shirt numbers and lettering. ' +
    'Do not repaint, stylise, add or remove anything. ' +
    (why ? `What the photo shows: ${why}` : '');
  const form = new FormData();
  form.append('model', process.env.MODEL || 'gpt-image-1');
  form.append('prompt', prompt);
  form.append('size', size);
  form.append('quality', QUALITY);
  form.append('input_fidelity', 'high');
  form.append('image[]', new Blob([fs.readFileSync(path.join(DIR, file))], { type: 'image/jpeg' }), file);
  const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form });
  const json = (await res.json()) as any;
  if (!res.ok) {
    console.error(`${file}: ${json.error?.message ?? res.status}`);
    process.exitCode = 1;
    continue;
  }
  await sharp(Buffer.from(json.data[0].b64_json, 'base64')).jpeg({ quality: 92 }).toFile(target);
  console.log(`${file}: colourised (${size}, saturation was ${Math.round(sat)})`);
}
