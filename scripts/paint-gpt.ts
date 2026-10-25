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
import { api, free, image, strip } from './lib/commons';

type Ref = { commons: string | null; why: string; kit?: string; crop?: string };
const refs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference-photos.json'), 'utf8')) as Record<string, Ref[]>;
const KEY = process.env.OPENAI_API_KEY;
// gpt-image-1 was shut down by OpenAI on 23 Oct 2026; its listed replacement is the GPT Image 2.5 pair (Sunburst: precise).
const MODEL = process.env.MODEL?.trim() || 'gpt-image-2.5-sunburst';
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
  'Keep the composition, pose, faces and likenesses exactly as photographed: each person\'s face, skin tone, hair and build must stay ' +
  'true to the photo, so the player is instantly recognisable. Do not add text, a signature or a frame.';

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
  // Only the gpt-image-1 family took this setting; the 2.5 models edit at high fidelity by default.
  if (MODEL.startsWith('gpt-image-1')) form.append('input_fidelity', 'high');
  const style = new Blob([fs.readFileSync(STYLE_REF)], { type: 'image/jpeg' });
  let prompt: string;
  if (ref.commons) {
    const source = path.join(ROOT, 'design/references', `${n}-1.jpg`);
    // Fetch the photo from Commons when the Reference photos workflow has not (licence-checked the same way).
    if (!fs.existsSync(source)) {
      const json = await api({ action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1600', titles: ref.commons });
      const ii = (Object.values(json.query?.pages ?? {})[0] as any)?.imageinfo?.[0];
      const lic = strip(ii?.extmetadata?.LicenseShortName?.value ?? '');
      if (!ii || !free(lic)) {
        console.error(`${n}: ${ref.commons} ${ii ? `has licence "${lic}", not free to reuse` : 'not found on Commons'}`);
        process.exitCode = 1;
        continue;
      }
      fs.mkdirSync(path.dirname(source), { recursive: true });
      await sharp(await image(ii.thumburl ?? ii.url)).rotate().resize(1600, 1600, { fit: 'inside' }).jpeg({ quality: 88 }).toFile(source);
      console.log(`${n}: reference ${ref.commons} (${lic}) downloaded`);
    }
    const cropped = await sharp(source).rotate().resize(1024, 1024, { fit: 'cover', position: ref.crop ?? sharp.strategy.attention }).jpeg({ quality: 92 }).toBuffer();
    form.append('image[]', new Blob([cropped], { type: 'image/jpeg' }), `${n}.jpg`);
    form.append('image[]', style, 'style.jpg');
    prompt =
      `Repaint the first image as ${wording(ref.kit)} The second image is the style reference: match its colour saturation, level of detail, ` +
      `contrast and brushwork, but not its subject, pose or composition. Scene: ${ref.why}`;
  } else {
    // No free photo: paint a scene with no real person in it. A named player is never painted from a description
    // (owner, 25 Oct 2026: a text-only "Drogba" came out looking nothing like him); give him a Commons photo instead.
    const scene = ref.why.replace(/^.*?Paint without a reference:\s*/, '');
    form.append('image[]', style, 'style.jpg');
    prompt =
      `Paint ${wording()} The attached image is the style reference: match its colour saturation, level of detail, contrast and brushwork, ` +
      `but not its subject, pose or composition. Scene: ${scene} Do not depict any specific real person; no recognisable face.`;
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
