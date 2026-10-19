/**
 * Searches Wikimedia Commons for candidate reference photos for each story,
 * using the queries in data/reference-queries.json, and writes one numbered
 * contact sheet per story so the editor can pick by eye.
 * Runs on GitHub's servers (workflow "Reference candidates"). Licence-checked.
 *
 *   design/candidates/NNN.jpg    (contact sheet, up to 16 photos, numbered)
 *   design/candidates/NNN.json   (the Commons file name, licence and caption for each number)
 *
 * Pick a number, copy its "commons" file name into data/reference-photos.json,
 * and the "Reference photos" workflow downloads it at full size.
 *
 *   npm run candidates            all stories
 *   npm run candidates -- 3 17    just these
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/stories';
import { api, free, image, strip } from './lib/commons';

type Query = { want: string; queries: string[] };
const all = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference-queries.json'), 'utf8')) as Record<string, Query>;
const only = process.argv.slice(2).map((n) => n.padStart(3, '0'));
const OUT = path.join(ROOT, 'design/candidates');
fs.mkdirSync(OUT, { recursive: true });

const PER_STORY = 16;
const TILE = 300;
const COLS = 4;
// Logos, crests, maps, kits and stadium shots without people are no use as references.
const SKIP = /logo|crest|badge|escudo|emblem|coat of arms|map|kit[ _]|jersey[ _]template|signature|autograph|stamp|coin|\.svg|\.tif/i;

for (const [n, q] of Object.entries(all).sort()) {
  if (only.length && !only.includes(n)) continue;

  // Take hits from each query in turn, so the first query cannot fill every slot.
  const lists: string[][] = [];
  for (const query of q.queries) {
    const res = await api({ action: 'query', list: 'search', srnamespace: '6', srlimit: '15', srsearch: `${query} filetype:bitmap` });
    lists.push((res.query?.search ?? []).map((hit: any) => hit.title).filter((t: string) => !SKIP.test(t)));
  }
  const titles: string[] = [];
  for (let i = 0; i < 15; i++) for (const list of lists) if (list[i] && !titles.includes(list[i])) titles.push(list[i]);

  const found: { title: string; licence: string; artist: string; caption: string; date: string; thumb: string; url: string }[] = [];
  for (let i = 0; i < titles.length && found.length < PER_STORY; i += 20) {
    const res = await api({
      action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '600',
      titles: titles.slice(i, i + 20).join('|'),
    });
    const pages = Object.values(res.query?.pages ?? {}) as any[];
    // The API returns pages in its own order; keep the search order, which ranks by relevance.
    pages.sort((a, b) => titles.indexOf(a.title) - titles.indexOf(b.title));
    for (const page of pages) {
      const ii = page.imageinfo?.[0];
      if (!ii || !/jpeg|png/.test(ii.mime) || ii.width < 500) continue;
      const licence = strip(ii.extmetadata?.LicenseShortName?.value ?? '');
      if (!free(licence)) continue;
      found.push({
        title: page.title,
        licence,
        artist: strip(ii.extmetadata?.Artist?.value ?? 'Unknown').split(';')[0].slice(0, 60),
        caption: strip(ii.extmetadata?.ImageDescription?.value ?? '').slice(0, 220),
        date: strip(ii.extmetadata?.DateTimeOriginal?.value ?? '').slice(0, 30),
        thumb: ii.thumburl ?? ii.url,
        url: ii.descriptionurl,
      });
      if (found.length === PER_STORY) break;
    }
  }

  const tiles: sharp.OverlayOptions[] = [];
  const kept: (Omit<(typeof found)[number], 'thumb'> & { no: number; commons: string })[] = [];
  for (const f of found) {
    let buf: Buffer;
    try {
      buf = await sharp(await image(f.thumb)).rotate().resize(TILE, TILE, { fit: 'contain', background: '#ffffff' }).jpeg().toBuffer();
    } catch (e) {
      console.warn(`${n} ${f.title}: ${(e as Error).message}`);
      continue;
    }
    const no = kept.length + 1;
    const x = ((no - 1) % COLS) * TILE;
    const y = Math.floor((no - 1) / COLS) * TILE;
    const label = Buffer.from(
      `<svg width="64" height="44"><rect width="64" height="44" fill="#000" opacity="0.75"/><text x="32" y="32" font-size="28" font-weight="bold" text-anchor="middle" fill="#fff" font-family="sans-serif">${no}</text></svg>`,
    );
    tiles.push({ input: buf, left: x, top: y }, { input: label, left: x, top: y });
    const { thumb, ...rest } = f;
    kept.push({ no, commons: f.title, ...rest });
  }

  const rows = Math.max(1, Math.ceil(kept.length / COLS));
  await sharp({ create: { width: COLS * TILE, height: rows * TILE, channels: 3, background: '#ffffff' } })
    .composite(tiles)
    .jpeg({ quality: 78 })
    .toFile(path.join(OUT, `${n}.jpg`));
  fs.writeFileSync(path.join(OUT, `${n}.json`), JSON.stringify({ want: q.want, candidates: kept }, null, 2) + '\n');
  console.log(`${n}: ${kept.length} candidates from ${titles.length} search hits`);
}
