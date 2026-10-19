/**
 * Share-card rendering with Satori + resvg. Pure functions: give them a story
 * and a hero buffer, get PNG buffers back. Used by scripts/images.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import type { StoryFrontmatter } from '../../src/schema/story';
import { splitTitle, storyNumber } from '../../src/schema/story';
import { ROOT } from './stories';

const FONTS_DIR = path.join(ROOT, 'src/assets/fonts');
const fonts = [
  { name: 'Libre Baskerville', data: fs.readFileSync(path.join(FONTS_DIR, 'LibreBaskerville-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
  { name: 'Libre Baskerville', data: fs.readFileSync(path.join(FONTS_DIR, 'LibreBaskerville-Regular.ttf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Libre Baskerville', data: fs.readFileSync(path.join(FONTS_DIR, 'LibreBaskerville-Italic.ttf')), weight: 400 as const, style: 'italic' as const },
  { name: 'Inter', data: fs.readFileSync(path.join(FONTS_DIR, 'Inter-Regular.otf')), weight: 400 as const, style: 'normal' as const },
  { name: 'Inter', data: fs.readFileSync(path.join(FONTS_DIR, 'Inter-SemiBold.otf')), weight: 600 as const, style: 'normal' as const },
];

const C = {
  bg: '#f7f3ea',
  ink: '#1d1b16',
  soft: '#4a463d',
  mute: '#7a7466',
  accent: '#1f6b3a',
  rule: '#ddd5c3',
};

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, props: Record<string, unknown> = {}, ...children: unknown[]): Node => ({
  type,
  props: { ...props, children: children.length === 1 ? children[0] : children },
});

async function heroDataUri(hero: Buffer, width: number, height = width): Promise<string> {
  // Crop to the exact frame here (keeping the most detailed area, usually the face)
  // rather than letting the card layout cut the top off.
  const buf = await sharp(hero).resize(width, height, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

async function toPng(node: Node, width: number, height: number): Promise<Buffer> {
  const svg = await satori(node as any, { width, height, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
  return Buffer.from(png);
}

const brand = (size = 22) =>
  h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 12 } },
    h('div', { style: { width: size * 1.2, height: size * 1.2, borderRadius: 8, background: C.accent, display: 'flex' } }),
    h('div', { style: { fontFamily: 'Inter', fontWeight: 600, fontSize: size, letterSpacing: 2, textTransform: 'uppercase', color: C.ink } }, 'Football Stories 101'),
  );

function fit(text: string, max: number, big: number, small: number) {
  return text.length > max ? small : big;
}

/** 1200x630 Open Graph image: hero on the right, headline on the left. */
export async function renderOg(story: StoryFrontmatter, hero: Buffer): Promise<Buffer> {
  const { subject, angle } = splitTitle(story.title);
  const img = await heroDataUri(hero, 500, 630);
  const abs = (top: number, height: number, extra: Record<string, unknown> = {}) => ({
    position: 'absolute',
    left: 56,
    top,
    width: 600,
    height,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    ...extra,
  });
  const node = h(
    'div',
    { style: { width: 1200, height: 630, display: 'flex', background: C.bg, color: C.ink, position: 'relative' } },
    h('div', { style: abs(44, 40) }, brand(20)),
    h(
      'div',
      { style: abs(120, 400, { justifyContent: 'center' }) },
      h('div', { style: { fontFamily: 'Inter', fontWeight: 600, fontSize: 20, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14, width: 600, lineClamp: 1 } }, `${storyNumber(story.number)} · ${subject}`),
      h('div', { style: { fontFamily: 'Libre Baskerville', fontWeight: 700, fontSize: fit(angle, 60, 48, 38), lineHeight: 1.15, color: C.ink, width: 600, lineClamp: 4 } }, angle || subject),
    ),
    h(
      'div',
      { style: abs(528, 62) },
      h('div', { style: { fontFamily: 'Libre Baskerville', fontStyle: 'italic', fontSize: 21, color: C.soft, lineHeight: 1.4, width: 600, lineClamp: 2 } }, story.dek),
    ),
    h('img', { src: img, width: 500, height: 630, style: { position: 'absolute', left: 700, top: 0, width: 500, height: 630, objectFit: 'cover' } }),
  );
  return toPng(node, 1200, 630);
}

/**
 * Headline card: a dark banner with one punchy line, the painting below it.
 * Used for the Facebook picture (1080x1080) and the Instagram cover (1080x1350).
 */
async function headlineCard(story: StoryFrontmatter, hero: Buffer, height: number): Promise<Buffer> {
  const { angle, subject } = splitTitle(story.title);
  const line = story.hook ?? (angle || subject);
  const bannerH = 300;
  const img = await heroDataUri(hero, 1080, height - bannerH - 4);
  const size = line.length > 80 ? 50 : line.length > 55 ? 58 : 66;
  const node = h(
    'div',
    { style: { width: 1080, height, display: 'flex', flexDirection: 'column', background: '#f4f1ea' } },
    h(
      'div',
      { style: { width: 1080, height: bannerH, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#141414' } },
      h('div', { style: { width: 940, fontFamily: 'Libre Baskerville', fontWeight: 400, fontSize: size, lineHeight: 1.22, color: '#ffffff', textAlign: 'center', lineClamp: 3, display: 'block' } }, line),
    ),
    h('div', { style: { width: 1080, height: 4, background: '#c9a24a', display: 'flex' } }),
    h('img', { src: img, width: 1080, height: height - bannerH - 4, style: { width: 1080, height: height - bannerH - 4, objectFit: 'cover' } }),
  );
  return toPng(node, 1080, height);
}

/** 1080x1350 Instagram cover. */
export const renderIgCover = (story: StoryFrontmatter, hero: Buffer) => headlineCard(story, hero, 1350);

/** 1080x1080 Facebook picture. */
export const renderFbCard = (story: StoryFrontmatter, hero: Buffer) => headlineCard(story, hero, 1080);

/** 1080x1350 fact slide. */
export async function renderIgFact(story: StoryFrontmatter, fact: string, index: number, total: number): Promise<Buffer> {
  const { subject } = splitTitle(story.title);
  const node = h(
    'div',
    { style: { width: 1080, height: 1350, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: C.bg, color: C.ink, padding: '72px 80px 64px' } },
    h(
      'div',
      { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
      h('div', { style: { fontFamily: 'Inter', fontWeight: 600, fontSize: 26, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', width: 800, lineClamp: 1 } }, subject),
      h('div', { style: { fontFamily: 'Inter', fontSize: 26, color: C.mute } }, `${index} / ${total}`),
    ),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', borderLeft: `10px solid ${C.accent}`, paddingLeft: 40, width: 920 } },
      h('div', { style: { fontFamily: 'Libre Baskerville', fontWeight: 700, fontSize: fit(fact, 110, 62, 50), lineHeight: 1.22, width: 870, lineClamp: 8 } }, fact),
    ),
    brand(24),
  );
  return toPng(node, 1080, 1350);
}

/** 1080x1350 closing slide: no website, just a follow line. */
export async function renderIgClose(story: StoryFrontmatter): Promise<Buffer> {
  const node = h(
    'div',
    { style: { width: 1080, height: 1350, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#141414', color: '#ffffff', padding: '80px' } },
    h('div', { style: { fontFamily: 'Inter', fontWeight: 600, fontSize: 26, letterSpacing: 2, textTransform: 'uppercase', color: '#c9a24a' } }, storyNumber(story.number)),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column' } },
      h('div', { style: { fontFamily: 'Libre Baskerville', fontWeight: 700, fontSize: 64, lineHeight: 1.18, marginBottom: 36, width: 920 } }, 'Follow for one true football story every morning.'),
      h('div', { style: { fontFamily: 'Libre Baskerville', fontStyle: 'italic', fontSize: 32, lineHeight: 1.4, opacity: 0.85, width: 920 } }, story.question ?? ''),
    ),
    h('div', { style: { fontFamily: 'Inter', fontWeight: 600, fontSize: 30, letterSpacing: 2, textTransform: 'uppercase' } }, 'Football Stories 101'),
  );
  return toPng(node, 1080, 1350);
}

/** Default 1200x630 share image for non-story pages. */
export async function renderDefault(tagline: string): Promise<Buffer> {
  const node = h(
    'div',
    { style: { width: 1200, height: 630, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: C.bg, color: C.ink, padding: '64px 72px' } },
    brand(24),
    h('div', { style: { fontFamily: 'Libre Baskerville', fontWeight: 700, fontSize: 66, lineHeight: 1.15, width: 1056 } }, 'One researched football story a day.'),
    h('div', { style: { fontFamily: 'Libre Baskerville', fontStyle: 'italic', fontSize: 28, color: C.soft, width: 1056 } }, tagline),
  );
  return toPng(node, 1200, 630);
}
