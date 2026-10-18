/**
 * Fetches each story's hero photo from Wikimedia Commons (hero.commons),
 * checks that its licence allows reuse, crops it to a square, applies a light
 * print-style grade, and writes the photographer, licence and file link into
 * the story's credit. Runs on GitHub's servers (workflow "Illustrate").
 *
 *   npx tsx scripts/commons-hero.ts [--force]
 *
 * Only these licences are accepted: public domain, CC0, CC BY, CC BY-SA.
 * Non-commercial (NC) and no-derivatives (ND) licences are refused.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { loadStories, PUBLIC_DIR, STORIES_DIR, ROOT } from './lib/stories';
import { pad3 } from '../src/schema/story';

const OUT = 1440;
const RECORD = path.join(ROOT, 'data/hero-sources.json');
const force = process.argv.includes('--force');
const UA = 'FootballStories101/1.0 (https://github.com/immigrationlabsg/football-stories-101)';

type Rec = Record<string, { commons: string; license: string; artist: string; url: string; crop?: string }>;
const record: Rec = fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, 'utf8')) : {};

const strip = (html: string) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

function cleanArtist(a: string): string {
  let x = a.split(';')[0].trim();
  x = x.replace(/^(.+?)\s+\1$/i, '$1'); // "Unknown author Unknown author"
  if (!x || /^unknown/i.test(x)) return 'Unknown photographer';
  if (/own (work|picture)|^self/i.test(x)) return 'Wikimedia Commons contributor';
  return x.slice(0, 80);
}

function licenceOk(short: string): boolean {
  const s = short.toLowerCase();
  if (/\bnc\b|non-?commercial|\bnd\b|no-?deriv/.test(s)) return false;
  return /public domain|^pd|cc0|cc[- ]by/.test(s);
}

async function info(title: string) {
  const api =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo' +
    '&iiprop=url|extmetadata|size&iiurlwidth=2000&titles=' + encodeURIComponent(title);
  const res = await fetch(api, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Commons API ${res.status}`);
  const json = (await res.json()) as any;
  const page = Object.values(json.query?.pages ?? {})[0] as any;
  const ii = page?.imageinfo?.[0];
  if (!ii) throw new Error(`no such file on Commons: ${title}`);
  const md = ii.extmetadata ?? {};
  return {
    download: ii.thumburl ?? ii.url,
    pageUrl: ii.descriptionurl as string,
    license: strip(md.LicenseShortName?.value ?? ''),
    artist: cleanArtist(strip(md.Artist?.value ?? '')),
  };
}

function setHeroField(file: string, key: string, value: string) {
  const p = path.join(STORIES_DIR, file);
  let s = fs.readFileSync(p, 'utf8');
  const line = `  ${key}: ${JSON.stringify(value)}`;
  const re = new RegExp(`^  ${key}: .*$`, 'm');
  if (re.test(s)) s = s.replace(re, line);
  else s = s.replace(/^hero:\n/m, `hero:\n${line}\n`);
  fs.writeFileSync(p, s);
}

const { stories, errors } = loadStories();
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}

let done = 0;
for (const s of stories) {
  const title = s.data.hero.commons;
  if (!title) continue;
  const n = pad3(s.data.number);
  const dest = path.join(PUBLIC_DIR, s.data.hero.src);
  const crop = s.data.hero.crop;
  if (!force && record[n]?.commons === title && (record[n]?.crop ?? 'attention') === crop && fs.existsSync(dest)) continue;
  console.log(`[${n}] ${title}`);
  try {
    const meta = await info(title);
    if (!licenceOk(meta.license)) {
      console.error(`  refused: licence "${meta.license}" is not free to reuse. Pick another file.`);
      process.exitCode = 1;
      continue;
    }
    const res = await fetch(meta.download, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`download ${res.status}`);
    const raw = Buffer.from(await res.arrayBuffer());
    // Square crop that keeps the most interesting area (faces, contrast),
    // then a gentle warm print grade so photos sit with the site's palette.
    await sharp(raw)
      .rotate()
      .resize(OUT, OUT, {
        fit: 'cover',
        position: crop === 'top' ? 'top' : crop === 'centre' ? 'centre' : sharp.strategy.attention,
      })
      .modulate({ saturation: 0.9, brightness: 1.02 })
      .tint({ r: 255, g: 246, b: 232 })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(dest);
    const credit = `Photo: ${meta.artist}, ${meta.license}, via Wikimedia Commons`;
    setHeroField(s.file, 'credit', credit);
    setHeroField(s.file, 'creditUrl', meta.pageUrl);
    record[n] = { commons: title, license: meta.license, artist: meta.artist, url: meta.pageUrl, crop };
    done++;
    console.log(`  saved; ${credit}`);
  } catch (e) {
    console.error(`  failed: ${(e as Error).message}`);
    process.exitCode = 1;
  }
}
fs.writeFileSync(RECORD, JSON.stringify(record, null, 2) + '\n');
console.log(`${done} photo(s) fetched.`);
