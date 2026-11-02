/**
 * Instagram test covers (owner approved 30 Oct 2026, docs/posting-format.md "Experiments and the house look"). Own file,
 * so a test never changes the cards or the Reel that Facebook and Threads use. The house look is kept: our painting,
 * the dark ground, the gold rule, Libre Baskerville.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { StoryFrontmatter } from '../../src/schema/story';
import { ROOT } from './stories';

const FONTS_DIR = path.join(ROOT, 'src/assets/fonts');
const fonts = [
  { name: 'Libre Baskerville', data: fs.readFileSync(path.join(FONTS_DIR, 'LibreBaskerville-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
  { name: 'Inter', data: fs.readFileSync(path.join(FONTS_DIR, 'Inter-SemiBold.otf')), weight: 600 as const, style: 'normal' as const },
];
type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, props: Record<string, unknown> = {}, ...children: unknown[]): Node => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } });
const W = 1080;
const H = 1350;
const GOLD = '#c9a24a';

/** The running test from data/schedule.json, if the story is in it: e.g. "first-frame". Quizzes are never tested. */
export function instagramTestFor(story: StoryFrontmatter): string | null {
  const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/schedule.json'), 'utf8')).instagram_test as { name: string; from: string; to: string } | null | undefined;
  // Only tests this file can build; a later test needs its own code here first (images.ts and social-post.ts follow this).
  if (!t || t.name !== 'first-frame' || story.format === 'quiz' || !story.stinger) return null;
  const day = new Date(story.date.getTime() + 8 * 3600e3).toISOString().slice(0, 10); // Singapore date
  return day >= t.from && day <= t.to ? t.name : null;
}

/**
 * "first-frame": the stinger in large type on a tall dark band, the painting below it. The words never cover the
 * painting, so no face is hidden (picture standard); the change against the usual cover is the size and the brevity.
 */
export async function renderFirstFrameCover(story: StoryFrontmatter, hero: Buffer): Promise<Buffer> {
  const band = 470;
  const imgH = H - band - 6;
  // A two-player comparison is shown whole on its paper colour (its lightest corner), as on the share card, so neither
  // player loses his head; any other painting fills the frame from the top, so heads and raised arms stay in (cutting from the bottom).
  const pair = story.series === 'On this day' && / v /.test(story.title.split(' / ')[0]);
  let fill = { r: 244, g: 241, b: 234 };
  if (pair) {
    const { width = 1024, height = 1024 } = await sharp(hero).metadata();
    const corners = await Promise.all(
      [[0, 0], [width - 16, 0], [0, height - 16], [width - 16, height - 16]].map(async ([left, top]) =>
        (await sharp(await sharp(hero).extract({ left, top, width: 16, height: 16 }).toBuffer()).stats()).channels.slice(0, 3).map((c) => c.mean),
      ),
    );
    const [r, g, b] = corners.reduce((best, c) => (c[0] + c[1] + c[2] > best[0] + best[1] + best[2] ? c : best)).map(Math.round);
    fill = { r, g, b };
  }
  const img = await sharp(hero)
    .resize(W, imgH, pair ? { fit: 'contain', background: fill } : { fit: 'cover', position: 'north' })
    .jpeg({ quality: 85 })
    .toBuffer();
  const words = story.stinger!;
  const size = words.length > 48 ? 78 : words.length > 34 ? 88 : 98;
  const node = h(
    'div',
    { style: { width: W, height: H, display: 'flex', flexDirection: 'column', background: '#141414' } },
    h(
      'div',
      { style: { width: W, height: band, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#141414' } },
      h('div', { style: { width: W - 120, fontFamily: 'Libre Baskerville', fontWeight: 700, fontSize: size, lineHeight: 1.12, color: '#ffffff', textAlign: 'center' } }, words),
    ),
    h('div', { style: { width: W, height: 6, background: GOLD, display: 'flex' } }),
    h('img', { src: `data:image/jpeg;base64,${img.toString('base64')}`, width: W, height: imgH, style: { width: W, height: imgH } }),
  );
  const svg = await satori(node as any, { width: W, height: H, fonts });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng());
}
