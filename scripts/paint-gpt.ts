/**
 * Paints the watercolour hero for a story with OpenAI's GPT Image API, using the
 * recipe the editor chose after the three-way test (recipe "C"):
 *   - the first reference photo in design/references/, cropped so the main subject is large;
 *   - the approved Ronaldo painting as a second image, to match its colour, detail and contrast;
 *   - high quality.
 * A story with no free photo is painted from the scene note and the Ronaldo reference alone.
 * Results land in design/paintings/NNN.png for the editor to review; nothing goes live from here.
 *
 * Runs on GitHub's servers (workflow "Paint with GPT Image"), which holds OPENAI_API_KEY.
 * The API is billed per image, separately from ChatGPT Plus.
 *
 *   npm run paint -- 5 6 7 8 9
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/stories';

type Ref = { commons: string | null; why: string; kit?: string };
const refs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference-photos.json'), 'utf8')) as Record<string, Ref[]>;
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL || 'gpt-image-1';
const QUALITY = process.env.QUALITY || 'high';
const OUT = path.join(ROOT, 'design/paintings');
// The editor's approved Ronaldo painting: the look every story is matched to.
const STYLE_REF = path.join(ROOT, 'public/images/stories/001-ronaldo-r9.jpg');
const stories = process.argv.slice(2).map((n) => n.padStart(3, '0'));
if (!KEY) throw new Error('OPENAI_API_KEY is not set. Add it as a repository secret (see docs/runbook.md, section 13).');
if (!stories.length) throw new Error('Give the story numbers to paint, e.g. npm run paint -- 5 6 7');
fs.mkdirSync(OUT, { recursive: true });

const wording = (kit?: string) =>
  'a detailed, semi-realistic watercolour illustration, like a sports-magazine cover. ' +
  'Vivid, saturated colours with strong contrast, crisp detail, confident brush edges, ' +
  'paper texture and loose splashes only around the borders, and a dark, detailed background with any crowd as blurred colour. ' +
  'Square (1:1) frame, the main subject large in the frame. Keep the colours true to the period' +
  (kit ? ` (${kit})` : '') +
  ', and keep every crest, logo, stripe, shirt number and lettering exactly as in the photo. ' +
  'Keep the composition, pose, faces and likenesses exactly as photographed. Do not add text, a signature or a frame.';

for (const n of stories) {
  const ref = refs[n]?.[0];
  if (!ref) {
    console.warn(`${n}: no entry in data/reference-photos.json`);
    continue;
  }
  const form = new FormData();
  form.append('model', MODEL);
  form.append('size', '1024x1024');
  form.append('quality', QUALITY);
  form.append('input_fidelity', 'high');
  const style = new Blob([fs.readFileSync(STYLE_REF)], { type: 'image/jpeg' });
  let prompt: string;
  if (ref.commons) {
    // Original photo by default; the colourised copy only when asked for (USE_COLOUR=1).
    const colour = path.join(ROOT, 'design/references/colour', `${n}-1.jpg`);
    const source = process.env.USE_COLOUR === '1' && fs.existsSync(colour) ? colour : path.join(ROOT, 'design/references', `${n}-1.jpg`);
    const cropped = await sharp(source).rotate().resize(1024, 1024, { fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 92 }).toBuffer();
    form.append('image[]', new Blob([cropped], { type: 'image/jpeg' }), `${n}.jpg`);
    form.append('image[]', style, 'style.jpg');
    prompt =
      `Repaint the first image as ${wording(ref.kit)} The second image is the style reference: match its colour saturation, level of detail, ` +
      `contrast and brushwork, but not its subject, pose or composition. Scene: ${ref.why}`;
  } else {
    // No free photo of this moment: paint the scene, with no real person's face.
    const scene = ref.why.replace(/^.*?Paint without a reference:\s*/, '');
    form.append('image[]', style, 'style.jpg');
    prompt =
      `Paint ${wording()} The attached image is the style reference: match its colour saturation, level of detail, contrast and brushwork, ` +
      `but not its subject, pose or composition. Scene: ${scene} No recognisable real person's face.`;
  }
  form.append('prompt', prompt);
  const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form });
  const json = (await res.json()) as any;
  if (!res.ok) {
    console.error(`${n}: ${json.error?.message ?? res.status}`);
    process.exitCode = 1;
    continue;
  }
  fs.writeFileSync(path.join(OUT, `${n}.png`), Buffer.from(json.data[0].b64_json, 'base64'));
  console.log(`${n}: painted (${ref.commons ?? 'no reference photo'})`);
}
