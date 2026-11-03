/**
 * Paints the watercolour hero for a story through OpenAI's Codex CLI, signed in with the owner's ChatGPT plan
 * (owner, 3 Nov 2026: use the plan instead of API credit). The default painter; scripts/paint-gpt.ts (the API,
 * workflow "Paint with GPT Image") is the fallback when the plan's limits are reached (`/status` in Codex).
 * Same photos, style reference and words as the API (scripts/lib/paint-inputs.ts), see docs/painting-with-codex.md.
 * Runs only on the owner's Mac, where `codex login` was done in the browser; no key is involved.
 * Results land in design/paintings/NNN.png for review; nothing goes live from here.
 *
 *   npm run paint:codex -- 43
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { ROOT } from './lib/stories';
import { STYLE_REF, paintInputs } from './lib/paint-inputs';

const OUT = path.join(ROOT, 'design/paintings');
const stories = process.argv.slice(2).map((n) => n.padStart(3, '0'));
if (!stories.length) throw new Error('Give the story numbers to paint, e.g. npm run paint:codex -- 43');
fs.mkdirSync(path.join(OUT, 'codex'), { recursive: true });

for (const n of stories) {
  const input = await paintInputs(n);
  if (!input) {
    process.exitCode = 1;
    continue;
  }
  const images: string[] = [];
  if (input.photo) {
    const file = path.join(OUT, 'codex', `${n}-input.jpg`);
    fs.writeFileSync(file, input.photo);
    images.push(file);
  }
  images.push(STYLE_REF);
  const raw = path.join(OUT, 'codex', `${n}-raw.png`);
  fs.rmSync(raw, { force: true });
  const order = input.photo ? 'The first attached image is the photo to repaint; the second is the style reference.' : 'The attached image is the style reference.';
  const task =
    `$imagegen Generate one square 1024x1024 image with the built-in image generation tool, using the attached images. ${order} ` +
    `Save the generated image as a PNG at ${raw} and do nothing else: no code, no edits to any other file. ` +
    `If image generation is refused or unavailable, say so plainly and do not try another wording.\n\nImage instructions:\n${input.prompt}`;
  console.log(`${n}: painting through Codex (${input.label})`);
  // The instructions go in on stdin: --image takes every argument after it, so a prompt placed there is read as a file.
  const run = spawnSync('codex', ['exec', '--sandbox', 'workspace-write', '-C', ROOT, ...images.flatMap((f) => ['-i', f])], {
    input: task,
    encoding: 'utf8',
    timeout: 15 * 60_000,
  });
  fs.writeFileSync(path.join(OUT, 'codex', `${n}-log.txt`), `${run.stdout ?? ''}\n${run.stderr ?? ''}`);
  if (run.status !== 0 || !fs.existsSync(raw)) {
    console.error(`${n}: Codex gave no painting (exit ${run.status}); see design/paintings/codex/${n}-log.txt`);
    process.exitCode = 1;
    continue;
  }
  // The same size and format the API painter produces, so npm run publish-painting / hand-over need no change.
  await sharp(raw).resize(1024, 1024, { fit: 'cover' }).png().toFile(path.join(OUT, `${n}.png`));
  console.log(`${n}: painted (${input.label}) -> design/paintings/${n}.png`);
}
