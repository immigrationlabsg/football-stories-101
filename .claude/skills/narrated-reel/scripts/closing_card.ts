/**
 * The page's own ending card for a narrated Reel: the same renderer and the same "no Story No. on an extra post" patch
 * as scripts/images.ts, so a narrated Reel ends exactly like every other post (owner, 7 Nov 2026).
 *   npx tsx .claude/skills/narrated-reel/scripts/closing_card.ts "Who's the next Como?" /path/to/folder/closing.png [storyNumber]
 * Run from the repo root. Give a storyNumber only for a numbered story; an extra post has none.
 */
import fs from 'node:fs';
import sharp from 'sharp';
import { renderIgClose } from '../../../../scripts/lib/cards';

const [question, out, number] = process.argv.slice(2);
if (!question || !out) throw new Error('usage: closing_card.ts "question" out.png [storyNumber]');
const card = await renderIgClose({ number: number ? Number(number) : 0, question } as never);
if (number) fs.writeFileSync(out, card);
else {
  const { data } = await sharp(card).extract({ left: 10, top: 10, width: 1, height: 1 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  await sharp(card)
    .composite([{ input: { create: { width: 340, height: 50, channels: 3, background: { r: data[0], g: data[1], b: data[2] } } }, left: 70, top: 72 }])
    .png()
    .toFile(out);
}
