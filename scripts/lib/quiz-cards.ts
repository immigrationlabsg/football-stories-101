/**
 * "Guess the legend" cards (owner, 25 Oct 2026): the shared mystery cover, four clue cards, the reveal (the answer over
 * the story's painting) and a "send this to a friend" card. 1080x1350, same fonts and colours as scripts/lib/cards.ts.
 * Kept in their own file so changing them never re-renders the other stories' cards and Reels.
 */
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import type { StoryFrontmatter } from '../../src/schema/story';
import { ROOT, PUBLIC_DIR } from './stories';

/** The same picture opens every quiz, so the cover gives nothing away. */
export const MYSTERY_COVER = path.join(PUBLIC_DIR, 'images/quiz-mystery.jpg');

const FONTS_DIR = path.join(ROOT, 'src/assets/fonts');
const fonts = [
  { name: 'Libre Baskerville', data: fs.readFileSync(path.join(FONTS_DIR, 'LibreBaskerville-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
  { name: 'Libre Baskerville', data: fs.readFileSync(path.join(FONTS_DIR, 'LibreBaskerville-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Libre Baskerville', data: fs.readFileSync(path.join(FONTS_DIR, 'LibreBaskerville-Italic.ttf')), weight: 400 as const, style: 'italic' as const },
  { name: 'Inter', data: fs.readFileSync(path.join(FONTS_DIR, 'Inter-Regular.otf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Inter', data: fs.readFileSync(path.join(FONTS_DIR, 'Inter-SemiBold.otf')), weight: 600 as const, style: 'normal' as const },
];
const C = { bg: '#f7f3ea', ink: '#1d1b16', accent: '#1f6b3a', gold: '#c9a24a', dark: '#141414', mute: '#7a7466' };
const W = 1080;
const H = 1350;
const BANNER = 330;
const IMG_H = H - BANNER - 6;

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, props: Record<string, unknown> = {}, ...children: unknown[]): Node => ({
  type,
  props: { ...props, children: children.length === 1 ? children[0] : children },
});
const toPng = async (node: Node) =>
  Buffer.from(new Resvg(await satori(node as any, { width: W, height: H, fonts }), { fitTo: { mode: 'width', value: W } }).render().asPng());
const uri = (b: Buffer) => `data:image/jpeg;base64,${b.toString('base64')}`;
const label = (t: string, color: string, size: number) =>
  h('div', { style: { fontFamily: 'Inter', fontWeight: 600, fontSize: size, letterSpacing: 4, textTransform: 'uppercase', color } }, t);
const brand = (color: string) =>
  h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 12 } },
    h('div', { style: { width: 28, height: 28, borderRadius: 8, background: C.accent, display: 'flex' } }),
    h('div', { style: { fontFamily: 'Inter', fontWeight: 600, fontSize: 24, letterSpacing: 2, textTransform: 'uppercase', color } }, 'Football Stories 101'),
  );
const abs = (top: number, extra: Record<string, unknown> = {}) => ({ position: 'absolute', left: 80, top, width: 920, display: 'flex', ...extra });
// Paintings are square; the card shows 1080 x IMG_H of it. Cut from the bottom only, so a head is never cropped.
const picture = (img: Buffer) => sharp(img).resize(W, IMG_H, { fit: 'cover', position: 'north' }).jpeg({ quality: 85 }).toBuffer();
const banner = (...children: Node[]) =>
  h('div', { style: { width: W, height: BANNER, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 } }, ...children);
const rule = () => h('div', { style: { width: W, height: 6, background: C.gold, display: 'flex' } });

export async function renderQuizCover(story: StoryFrontmatter, mystery: Buffer): Promise<Buffer> {
  const img = await picture(mystery);
  return toPng(
    h(
      'div',
      { style: { width: W, height: H, display: 'flex', flexDirection: 'column', background: C.dark } },
      banner(
        label('Guess the legend', C.gold, 34),
        h('div', { style: { fontFamily: 'Libre Baskerville', fontSize: 58, color: '#fff', textAlign: 'center', width: 940 } }, `${story.clues.length} clues. How many do you need?`),
      ),
      rule(),
      h(
        'div',
        { style: { width: W, height: IMG_H, display: 'flex', position: 'relative' } },
        h('img', { src: uri(img), width: W, height: IMG_H, style: { position: 'absolute', left: 0, top: 0 } }),
        h('div', { style: { position: 'absolute', left: 0, top: 0, width: W, height: IMG_H, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Libre Baskerville', fontWeight: 700, fontSize: 420, color: 'rgba(255,255,255,0.85)' } }, '?'),
      ),
    ),
  );
}

export function renderQuizClue(story: StoryFrontmatter, i: number): Promise<Buffer> {
  const text = story.clues[i - 1];
  const last = i === story.clues.length;
  return toPng(
    h(
      'div',
      { style: { width: W, height: H, display: 'flex', position: 'relative', background: C.bg, color: C.ink } },
      h('div', { style: abs(72, { justifyContent: 'space-between', alignItems: 'center' }) }, label('Guess the legend', C.accent, 24), label(`Clue ${i} of ${story.clues.length}`, C.mute, 24)),
      h(
        'div',
        { style: abs(330, { flexDirection: 'column' }) },
        h('div', { style: { fontFamily: 'Libre Baskerville', fontWeight: 700, fontSize: 220, color: C.gold, lineHeight: 1, marginBottom: 40 } }, String(i)),
        h('div', { style: { fontFamily: 'Libre Baskerville', fontWeight: 700, fontSize: text.length > 95 ? 54 : 62, lineHeight: 1.22, width: 920 } }, text),
      ),
      h('div', { style: abs(1236, { justifyContent: 'space-between', alignItems: 'center' }) }, brand(C.ink), h('div', { style: { fontFamily: 'Inter', fontSize: 26, color: C.mute } }, last ? 'Last chance…' : 'Got it yet?')),
    ),
  );
}

export async function renderQuizReveal(story: StoryFrontmatter, hero: Buffer): Promise<Buffer> {
  const img = await picture(hero);
  return toPng(
    h(
      'div',
      { style: { width: W, height: H, display: 'flex', flexDirection: 'column', background: C.dark } },
      banner(label('It’s…', C.gold, 32), h('div', { style: { fontFamily: 'Libre Baskerville', fontWeight: 700, fontSize: (story.answer ?? '').length > 22 ? 64 : 76, color: '#fff', textAlign: 'center', width: 1000 } }, story.answer ?? '')),
      rule(),
      h('img', { src: uri(img), width: W, height: IMG_H }),
    ),
  );
}

export function renderQuizClose(): Promise<Buffer> {
  return toPng(
    h(
      'div',
      { style: { width: W, height: H, display: 'flex', position: 'relative', background: C.dark, color: '#fff' } },
      h('div', { style: abs(80) }, label('Guess the legend', C.gold, 26)),
      h(
        'div',
        { style: abs(430, { flexDirection: 'column' }) },
        h('div', { style: { fontFamily: 'Libre Baskerville', fontWeight: 700, fontSize: 70, lineHeight: 1.18, width: 920, marginBottom: 44 } }, 'How many clues did you need?'),
        h('div', { style: { fontFamily: 'Libre Baskerville', fontStyle: 'italic', fontSize: 40, lineHeight: 1.4, width: 920, marginBottom: 44, color: '#e9e4d8' } }, 'Send this to the friend who thinks they know football.'),
        h('div', { style: { fontFamily: 'Inter', fontSize: 30, width: 920, color: '#b9b4a8' } }, 'Follow for one true football story every morning.'),
      ),
      h('div', { style: abs(1220) }, brand('#fff')),
    ),
  );
}
