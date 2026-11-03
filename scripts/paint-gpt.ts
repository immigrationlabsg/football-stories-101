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
 * The API is billed per image, separately from ChatGPT Plus. This is the fallback painter: the default is
 * scripts/paint-codex.ts on the owner's Mac (ChatGPT plan), which sends the same images and words (scripts/lib/paint-inputs.ts).
 *
 *   npm run paint -- 5 6 7 8 9
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/stories';
import { STYLE_REF, paintInputs } from './lib/paint-inputs';

const KEY = process.env.OPENAI_API_KEY;
// gpt-image-1 was shut down by OpenAI on 23 Oct 2026; its listed replacement is the GPT Image 2.5 pair (Sunburst: precise).
const MODEL = process.env.MODEL?.trim() || 'gpt-image-2.5-sunburst';
const QUALITY = process.env.QUALITY || 'high';
const OUT = path.join(ROOT, 'design/paintings');
const stories = process.argv.slice(2).map((n) => n.padStart(3, '0'));
if (!KEY) throw new Error('OPENAI_API_KEY is not set. Add it as a repository secret (see docs/runbook.md, section 13).');
if (!stories.length) throw new Error('Give the story numbers to paint, e.g. npm run paint -- 5 6 7');
fs.mkdirSync(OUT, { recursive: true });

for (const n of stories) {
  const input = await paintInputs(n);
  if (!input) {
    process.exitCode = 1;
    continue;
  }
  const { photo, prompt } = input;
  const form = new FormData();
  form.append('model', MODEL);
  form.append('size', '1024x1024');
  form.append('quality', QUALITY);
  // Only the gpt-image-1 family took this setting; the 2.5 models edit at high fidelity by default.
  if (MODEL.startsWith('gpt-image-1')) form.append('input_fidelity', 'high');
  if (photo) form.append('image[]', new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), `${n}.jpg`);
  form.append('image[]', new Blob([fs.readFileSync(STYLE_REF)], { type: 'image/jpeg' }), 'style.jpg');
  form.append('prompt', prompt);
  const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form });
  const json = (await res.json()) as any;
  if (!res.ok) {
    console.error(`${n}: ${json.error?.message ?? res.status}`);
    process.exitCode = 1;
    continue;
  }
  fs.writeFileSync(path.join(OUT, `${n}.png`), Buffer.from(json.data[0].b64_json, 'base64'));
  console.log(`${n}: painted (${input.label})`);
  // What each painting used, as OpenAI reports it, so the cost per picture is known from real runs (owner, 3 Nov 2026).
  const u = json.usage ?? {};
  const row = [new Date().toISOString(), n, MODEL, QUALITY, u.input_tokens_details?.text_tokens ?? '', u.input_tokens_details?.image_tokens ?? '', u.output_tokens ?? '', u.total_tokens ?? ''];
  // One small file per painting, so two paint runs saving at once never overwrite each other's record.
  const when = new Date().toISOString().replace(/[:.]/g, '-');
  fs.mkdirSync(path.join(OUT, 'usage'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'usage', `${n}-${when}.csv`), 'when,story,model,quality,text_in,image_in,out,total\n' + row.map((x) => String(x).replace(/,/g, ' ')).join(',') + '\n');
  console.log(`${n}: usage ${JSON.stringify(u)}`);
}
