/**
 * Makes one small change to an existing painting with GPT Image and leaves the
 * rest alone, e.g. adding a crest. The source is design/paintings/NNN-base.png;
 * the result is design/paintings/NNN.png.
 *
 *   npm run touchup -- 2 "Add the club crest on the left chest of the white shirt"
 *
 * Runs on GitHub's servers (workflow "Touch up a painting"), which holds OPENAI_API_KEY.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/stories';

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) throw new Error('OPENAI_API_KEY is not set.');
const [num, ...rest] = process.argv.slice(2);
const instruction = rest.join(' ').trim();
if (!num || !instruction) throw new Error('Usage: npm run touchup -- <story number> "<what to change>"');
const n = num.padStart(3, '0');
const dir = path.join(ROOT, 'design/paintings');
const prompt =
  `${instruction}. Change nothing else: keep the exact painting, the same faces, poses, composition, colours, ` +
  'brushwork, paper texture and background, as a loose hand-made watercolour. Do not add text.';

const form = new FormData();
const MODEL = process.env.MODEL?.trim() || 'gpt-image-2.5-sunburst'; // gpt-image-1 was shut down on 23 Oct 2026
form.append('model', MODEL);
form.append('prompt', prompt);
form.append('size', '1024x1024');
form.append('quality', process.env.QUALITY || 'high');
if (MODEL.startsWith('gpt-image-1')) form.append('input_fidelity', 'high');
form.append('image[]', new Blob([fs.readFileSync(path.join(dir, `${n}-base.png`))], { type: 'image/png' }), `${n}.png`);
const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form });
const json = (await res.json()) as any;
if (!res.ok) throw new Error(json.error?.message ?? String(res.status));
fs.writeFileSync(path.join(dir, `${n}.png`), Buffer.from(json.data[0].b64_json, 'base64'));
console.log(`${n}: touched up`);
