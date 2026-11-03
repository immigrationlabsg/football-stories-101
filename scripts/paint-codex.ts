/**
 * Paints the watercolour hero for a story through OpenAI's Codex CLI, signed in with the owner's ChatGPT plan
 * (owner, 3 Nov 2026: use the plan instead of API credit). The default painter; scripts/paint-gpt.ts (the API,
 * workflow "Paint with GPT Image") is the fallback when the plan's limits are reached (`/status` in Codex).
 * Same photos, style reference and words as the API (scripts/lib/paint-inputs.ts), see docs/painting-with-codex.md.
 * Runs only on the owner's Mac, where `codex login` was done in the browser; no key is involved.
 * Results land in design/paintings/NNN.png for review; nothing goes live from here.
 *
 *   npm run paint:codex -- 43 44 45       (PARALLEL=3 by default: that many stories paint at once)
 *
 * Kept lean (owner, 4 Nov 2026: "make the image generation increase in efficiency"): Codex only calls its built-in
 * image tool, with no skill file, no AGENTS.md, no shell commands and no file writes (it runs read-only); this script
 * picks the picture up from Codex's own folder. Time and tokens per painting go to design/paintings/codex/usage.csv.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { ROOT } from './lib/stories';
import { STYLE_REF, paintInputs } from './lib/paint-inputs';

const OUT = path.join(ROOT, 'design/paintings');
const WORK = path.join(OUT, 'codex');
const GENERATED = path.join(os.homedir(), '.codex/generated_images');
const PARALLEL = Math.max(1, Number(process.env.PARALLEL) || 3);
const stories = process.argv.slice(2).map((n) => n.padStart(3, '0'));
if (!stories.length) throw new Error('Give the story numbers to paint, e.g. npm run paint:codex -- 43');
fs.mkdirSync(WORK, { recursive: true });
// A smaller copy of the style reference uploads faster; it only sets the look, not the subject. Made once, before the
// parallel workers start, and written under a temporary name so no worker can attach a half-written file.
const STYLE = path.join(WORK, 'style.jpg');
await sharp(STYLE_REF).resize(768, 768).jpeg({ quality: 88 }).toFile(`${STYLE}.tmp`);
fs.renameSync(`${STYLE}.tmp`, STYLE);

function codex(args: string[], input: string): Promise<{ status: number | null; output: string }> {
  return new Promise((resolve) => {
    const child = spawn('codex', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (d) => (output += d));
    child.stderr.on('data', (d) => (output += d));
    const timer = setTimeout(() => child.kill(), 15 * 60_000);
    child.on('close', (status) => {
      clearTimeout(timer);
      resolve({ status, output });
    });
    child.stdin.end(input);
  });
}

async function paint(n: string): Promise<boolean> {
  const input = await paintInputs(n);
  if (!input) return false;
  const images: string[] = [];
  if (input.photo) {
    const file = path.join(WORK, `${n}-input.jpg`);
    fs.writeFileSync(file, input.photo);
    images.push(file);
  }
  images.push(STYLE);
  const order = input.photo ? 'The first attached image is the photo to repaint; the second is the style reference.' : 'The attached image is the style reference.';
  // The instructions go in on stdin: --image takes every argument after it, so a prompt placed there is read as a file.
  const task =
    `Call your built-in image_gen tool exactly once to make one square 1024x1024 image from the attached images. ${order} ` +
    // Codex otherwise rewrites the instructions in its own words and drops rules such as the headroom one (4 Nov 2026).
    `Give image_gen the Image instructions below word for word as its prompt: do not shorten, reword or add to them. ` +
    `Do not read any file, run any command or write any file, and do not load a skill. When the image is made, reply only DONE. ` +
    `If image generation is refused or unavailable, reply REFUSED and the reason, and do not try another wording.\n\nImage instructions:\n${input.prompt}`;
  console.log(`${n}: painting through Codex (${input.label})`);
  const started = Date.now();
  const run = await codex(
    ['exec', '--skip-git-repo-check', '--sandbox', 'read-only', '-c', 'project_doc_max_bytes=0', '-C', WORK, ...images.flatMap((f) => ['-i', f])],
    task,
  );
  const seconds = Math.round((Date.now() - started) / 1000);
  fs.writeFileSync(path.join(WORK, `${n}-log.txt`), run.output);
  const session = /session id:\s*([0-9a-f-]+)/i.exec(run.output)?.[1];
  const tokens = /tokens used\s*\n\s*([\d,]+)/i.exec(run.output)?.[1]?.replace(/,/g, '') ?? '';
  const dir = session ? path.join(GENERATED, session) : '';
  const made = dir && fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => path.join(dir, f)) : [];
  const usage = path.join(WORK, 'usage.csv');
  if (!fs.existsSync(usage)) fs.writeFileSync(usage, 'when,story,seconds,tokens,result\n');
  fs.appendFileSync(usage, `${new Date().toISOString()},${n},${seconds},${tokens},${made.length ? 'painted' : 'none'}\n`);
  if (run.status !== 0 || !made.length) {
    console.error(`${n}: Codex gave no painting (exit ${run.status}, ${seconds}s); see design/paintings/codex/${n}-log.txt`);
    return false;
  }
  // The newest image of the session, in the same size and format the API painter produces, so npm run
  // publish-painting / hand-over need no change.
  const newest = made.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  await sharp(newest).resize(1024, 1024, { fit: 'cover' }).png().toFile(path.join(OUT, `${n}.png`));
  console.log(`${n}: painted (${input.label}) in ${seconds}s, ${tokens || '?'} tokens -> design/paintings/${n}.png`);
  return true;
}

const queue = [...stories];
const results = await Promise.all(
  Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => {
    let ok = true;
    for (let n = queue.shift(); n; n = queue.shift()) ok = (await paint(n)) && ok;
    return ok;
  }),
);
if (results.includes(false)) process.exitCode = 1;
