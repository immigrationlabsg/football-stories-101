/**
 * The "Legendary XI" card (owner, 30 Oct 2026): a team's starting eleven on a painted-style pitch, for stories about a
 * famous side. Its own file, so changing it re-renders only stories that have a lineup, never every Reel.
 */
import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { StoryFrontmatter } from '../../src/schema/story';
import { ROOT } from './stories';

const FONTS_DIR = path.join(ROOT, 'src/assets/fonts');
const fonts = [
  { name: 'Libre Baskerville', data: fs.readFileSync(path.join(FONTS_DIR, 'LibreBaskerville-Bold.ttf')), weight: 700 as const, style: 'normal' as const },
  { name: 'Libre Baskerville', data: fs.readFileSync(path.join(FONTS_DIR, 'LibreBaskerville-Italic.ttf')), weight: 400 as const, style: 'italic' as const },
  { name: 'Inter', data: fs.readFileSync(path.join(FONTS_DIR, 'Inter-SemiBold.otf')), weight: 600 as const, style: 'normal' as const },
];
type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, props: Record<string, unknown> = {}, ...children: unknown[]): Node => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } });

const W = 1080;
const H = 1350;
const GOLD = '#c9a24a';

/** 1080x1350: title on top, then the rows from attack (top) to goalkeeper (bottom) on a dark green pitch. */
export async function renderLineup(story: StoryFrontmatter): Promise<Buffer> {
  const l = story.lineup!;
  const pitchTop = 230;
  const pitchH = H - pitchTop - 150;
  const rowH = pitchH / l.rows.length;
  const line = (style: Record<string, unknown>) => h('div', { style: { position: 'absolute', display: 'flex', borderColor: 'rgba(255,255,255,0.18)', borderStyle: 'solid', borderWidth: 0, ...style } });
  const node = h(
    'div',
    { style: { width: W, height: H, display: 'flex', flexDirection: 'column', position: 'relative', background: '#141414', color: '#fff' } },
    h(
      'div',
      { style: { position: 'absolute', left: 0, top: 60, width: W, display: 'flex', flexDirection: 'column', alignItems: 'center' } },
      h('div', { style: { fontFamily: 'Inter', fontWeight: 600, fontSize: 26, letterSpacing: 3, textTransform: 'uppercase', color: GOLD } }, 'The legendary XI'),
      h('div', { style: { fontFamily: 'Libre Baskerville', fontWeight: 700, fontSize: 52, marginTop: 18, textAlign: 'center', width: 980 } }, l.title),
    ),
    // the pitch: a rounded green field with the halfway line, a small centre circle and both penalty areas, drawn clear of the names
    h(
      'div',
      { style: { position: 'absolute', left: 60, top: pitchTop, width: W - 120, height: pitchH, display: 'flex', borderRadius: 28, background: 'linear-gradient(180deg, #1f4d2e 0%, #173d24 100%)', border: `3px solid ${GOLD}` } },
      line({ left: 0, top: pitchH / 2, width: W - 126, borderTopWidth: 3 }),
      line({ left: (W - 120) / 2 - 70, top: pitchH / 2 - 70, width: 140, height: 140, borderWidth: 3, borderRadius: 70 }),
      line({ left: (W - 120) / 2 - 230, top: pitchH - 190, width: 460, height: 190, borderWidth: 3, borderBottomWidth: 0 }),
      line({ left: (W - 120) / 2 - 230, top: -3, width: 460, height: 193, borderWidth: 3, borderTopWidth: 0 }),
    ),
    ...l.rows.map((row, r) =>
      h(
        'div',
        { style: { position: 'absolute', left: 60, top: pitchTop + r * rowH, width: W - 120, height: rowH, display: 'flex', justifyContent: 'space-evenly', alignItems: 'center' } },
        ...row.map((name) =>
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: Math.min(240, (W - 160) / row.length) } },
            h('div', { style: { width: 34, height: 34, borderRadius: 17, background: GOLD, display: 'flex', marginBottom: 10 } }),
            h('div', { style: { fontFamily: 'Inter', fontWeight: 600, fontSize: row.length > 4 ? 30 : 34, textAlign: 'center' } }, name),
          ),
        ),
      ),
    ),
    h('div', { style: { position: 'absolute', left: 0, bottom: 60, width: W, display: 'flex', justifyContent: 'center', fontFamily: 'Libre Baskerville', fontStyle: 'italic', fontSize: 30, opacity: 0.85 } }, l.note ?? ''),
  );
  const svg = await satori(node as any, { width: W, height: H, fonts });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng());
}
