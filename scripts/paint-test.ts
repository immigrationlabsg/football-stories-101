/**
 * Paints one story three ways so the editor can choose the recipe to use for
 * every other story. Results go to design/paintings/test/NNN-A.png, -B.png, -C.png.
 *
 *   A  medium quality, new wording
 *   B  high quality, new wording
 *   C  high quality, new wording, and the approved Ronaldo painting pushed harder as a reference
 *
 * Uses the colourised copy of the reference photo when there is one, and crops
 * it to the main subject so the face is large. Runs on GitHub's servers
 * (workflow "Paint test") with OPENAI_API_KEY.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/stories';

type Ref = { commons: string | null; why: string; kit?: string };
const refs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference-photos.json'), 'utf8')) as Record<string, Ref[]>;
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) throw new Error('OPENAI_API_KEY is not set.');
const n = (process.argv[2] ?? '').padStart(3, '0');
const ref = refs[n]?.[0];
if (!ref?.commons) throw new Error(`No reference photo for story ${n}`);
const colour = path.join(ROOT, 'design/references/colour', `${n}-1.jpg`);
// The colourised copy is used only when asked for (USE_COLOUR=1); the original photo is the default.
const source = process.env.USE_COLOUR === '1' && fs.existsSync(colour) ? colour : path.join(ROOT, 'design/references', `${n}-1.jpg`);
const STYLE_REF = path.join(ROOT, 'public/images/stories/001-ronaldo-r9.jpg');
const OUT = path.join(ROOT, 'design/paintings/test');
fs.mkdirSync(OUT, { recursive: true });

const WORDING =
  'a detailed, semi-realistic watercolour illustration, like a sports-magazine cover. ' +
  'Vivid, saturated colours with strong contrast, crisp detail in the face, kit and boots, confident brush edges, ' +
  'paper texture and loose splashes only around the borders, and a dark, detailed stadium background with the crowd as blurred colour. ' +
  'Square (1:1) frame, the main player large in the frame. Keep the shirt colours true to the period' +
  (ref.kit ? ` (${ref.kit})` : '') +
  ', and keep every crest, logo, stripe, shirt number and lettering exactly as in the photo. ' +
  'Keep the composition, pose, face and likeness exactly as photographed. Do not add text, a signature or a frame.';

const cropped = await sharp(source).rotate().resize(1024, 1024, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 92 }).toBuffer();

const variants: { id: string; quality: string; useRef: boolean }[] = [
  { id: 'A', quality: 'medium', useRef: false },
  { id: 'B', quality: 'high', useRef: false },
  { id: 'C', quality: 'high', useRef: true },
];
for (const v of variants) {
  const prompt = v.useRef
    ? `Repaint the first image as ${WORDING} The second image is the style reference: match its colour saturation, level of detail, contrast ` +
      `and brushwork, but not its subject, pose or composition. Scene: ${ref.why}`
    : `Repaint the attached photo as ${WORDING} Scene: ${ref.why}`;
  const form = new FormData();
  form.append('model', process.env.MODEL || 'gpt-image-1');
  form.append('prompt', prompt);
  form.append('size', '1024x1024');
  form.append('quality', v.quality);
  form.append('input_fidelity', 'high');
  form.append('image[]', new Blob([cropped], { type: 'image/jpeg' }), `${n}.jpg`);
  if (v.useRef) form.append('image[]', new Blob([fs.readFileSync(STYLE_REF)], { type: 'image/jpeg' }), 'style.jpg');
  const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form });
  const json = (await res.json()) as any;
  if (!res.ok) {
    console.error(`${v.id}: ${json.error?.message ?? res.status}`);
    process.exitCode = 1;
    continue;
  }
  fs.writeFileSync(path.join(OUT, `${n}-${v.id}.png`), Buffer.from(json.data[0].b64_json, 'base64'));
  console.log(`${v.id}: done (${v.quality}${v.useRef ? ', with Ronaldo reference' : ''}, source ${path.basename(path.dirname(source))}/${path.basename(source)})`);
}
fs.writeFileSync(path.join(OUT, `${n}-source.jpg`), cropped);
