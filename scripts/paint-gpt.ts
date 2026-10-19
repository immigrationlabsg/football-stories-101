/**
 * Paints the watercolour hero for a story with OpenAI's GPT Image API, from the
 * first reference photo in design/references/ (or from the scene note alone
 * when the story has no free photo). Results land in design/paintings/NNN.png
 * for the editor to review; nothing goes live from here.
 *
 * Runs on GitHub's servers (workflow "Paint with GPT Image"), which holds the
 * OPENAI_API_KEY secret. The API is billed per image, separately from ChatGPT Plus.
 *
 *   npm run paint -- 2 3 4            these stories
 *   QUALITY=high npm run paint -- 2   higher quality, higher price
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/stories';

type Ref = { commons: string | null; why: string; style?: 'celebrate'; kit?: string };
const refs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference-photos.json'), 'utf8')) as Record<string, Ref[]>;
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.MODEL || 'gpt-image-1';
const QUALITY = process.env.QUALITY || 'medium';
const OUT = path.join(ROOT, 'design/paintings');
// The editor's approved Ronaldo painting: the look every "celebrate" story is matched to.
const STYLE_REF = path.join(ROOT, 'public/images/stories/001-ronaldo-r9.jpg');
const stories = process.argv.slice(2).map((n) => n.padStart(3, '0'));
if (!KEY) throw new Error('OPENAI_API_KEY is not set. Add it as a repository secret (see docs/runbook.md, section 13).');
if (!stories.length) throw new Error('Give the story numbers to paint, e.g. npm run paint -- 2 3 4');
fs.mkdirSync(OUT, { recursive: true });

const STYLE =
  'a loose, hand-made watercolour illustration in the style of an editorial newsletter cover. ' +
  'Soft, transparent washes, visible paper texture, confident brush edges with no ink outlines and gentle colour bleeds, ' +
  'on a warm off-white paper background that fades out at the edges. Square (1:1) frame. ' +
  'Keep the shirt colours true to the period. Do not add text, a signature or a frame.';

for (const n of stories) {
  const ref = refs[n]?.[0];
  if (!ref) {
    console.warn(`${n}: no entry in data/reference-photos.json`);
    continue;
  }
  let res: Response;
  if (ref.commons) {
    const photo = path.join(OUT, '..', 'references', `${n}-1.jpg`);
    const celebrate = ref.style === 'celebrate';
    const prompt = celebrate
      ? `Repaint this as ${STYLE} The first image is the photo: use it for the player\u2019s face, likeness, hair and expression, ` +
        `so he is recognisable. The second image is the style reference: match its look exactly. One player only, from the waist up, ` +
        `filling the square, arms spread wide in joyful celebration, painted loose on plain warm paper with the background reduced to faint washes. ` +
        `Kit: ${ref.kit}. Scene: ${ref.why}`
      : `Repaint the attached photo as ${STYLE} Keep every person\u2019s likeness, face, expression and pose as in the photo, ` +
        `so they are recognisable, and keep the moment the photo captures. Simplify the background into loose washes. Scene: ${ref.why}`;
    const form = new FormData();
    form.append('model', MODEL);
    form.append('prompt', prompt);
    form.append('size', '1024x1024');
    form.append('quality', QUALITY);
    form.append('input_fidelity', 'high');
    form.append('image[]', new Blob([fs.readFileSync(photo)], { type: 'image/jpeg' }), `${n}.jpg`);
    if (celebrate) form.append('image[]', new Blob([fs.readFileSync(STYLE_REF)], { type: 'image/jpeg' }), 'style.jpg');
    res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form });
  } else {
    // No free photo of this moment: paint the scene, with no real person's face.
    const scene = ref.why.replace(/^.*?Paint without a reference:\s*/, '');
    const prompt = `Paint ${STYLE} Scene: ${scene} No recognisable real person's face.`;
    res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, prompt, size: '1024x1024', quality: QUALITY }),
    });
  }
  const json = (await res.json()) as any;
  if (!res.ok) {
    console.error(`${n}: ${json.error?.message ?? res.status}`);
    process.exitCode = 1;
    continue;
  }
  fs.writeFileSync(path.join(OUT, `${n}.png`), Buffer.from(json.data[0].b64_json, 'base64'));
  console.log(`${n}: painted (${ref.commons ?? 'no reference'})`);
}
