/**
 * Downloads the reference photos listed in data/reference-photos.json from
 * Wikimedia Commons into design/references/, for repainting in ChatGPT.
 * Runs on GitHub's servers (workflow "Reference photos"). Licence-checked.
 *
 *   design/references/NNN-1.jpg, NNN-2.jpg   (best first)
 *   design/references/README.md              (credits, licences, links)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT } from './lib/stories';

type Ref = { commons: string | null; licence?: string; why?: string };
const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/reference-photos.json'), 'utf8')) as Record<string, Ref[]>;
const OUT = path.join(ROOT, 'design/references');
const UA = 'FootballStories101/1.0 (https://github.com/immigrationlabsg/football-stories-101)';
fs.mkdirSync(OUT, { recursive: true });

const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const free = (l: string) => !/\bnc\b|non-?commercial|\bnd\b|no-?deriv/i.test(l) && /public domain|^pd|cc0|cc[- ]by/i.test(l);

const rows: string[] = ['| File | Story | Licence | Photographer | Source |', '|---|---|---|---|---|'];
for (const [n, refs] of Object.entries(list).sort()) {
  for (const [i, ref] of (refs ?? []).slice(0, 2).entries()) {
    const name = `${n}-${i + 1}.jpg`;
    if (!ref.commons) {
      rows.push(`| (paint without a reference) | ${n} | | | ${ref.why ?? ''} |`);
      continue;
    }
    try {
      const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600&titles=' + encodeURIComponent(ref.commons);
      const json = (await (await fetch(api, { headers: { 'User-Agent': UA } })).json()) as any;
      const ii = (Object.values(json.query?.pages ?? {})[0] as any)?.imageinfo?.[0];
      if (!ii) throw new Error('not found on Commons');
      const lic = strip(ii.extmetadata?.LicenseShortName?.value ?? '');
      const artist = strip(ii.extmetadata?.Artist?.value ?? 'Unknown').split(';')[0].slice(0, 60);
      if (!free(lic)) throw new Error(`licence "${lic}" not free to reuse`);
      const buf = Buffer.from(await (await fetch(ii.thumburl ?? ii.url, { headers: { 'User-Agent': UA } })).arrayBuffer());
      await sharp(buf).rotate().resize(1600, 1600, { fit: 'inside' }).jpeg({ quality: 88 }).toFile(path.join(OUT, name));
      rows.push(`| ${name} | ${n} | ${lic} | ${artist} | [Commons](${ii.descriptionurl}) |`);
      console.log(`${name}: ${ref.commons} (${lic})`);
    } catch (e) {
      rows.push(`| (not downloaded) | ${n} | ${(e as Error).message} | | ${ref.commons} |`);
      console.warn(`${n} ${ref.commons}: ${(e as Error).message}`);
    }
  }
}
fs.writeFileSync(
  path.join(OUT, 'README.md'),
  `# Reference photos for the watercolours\n\nSave a photo from this folder on your phone, attach it in ChatGPT with the prompt in docs/picture-guide.md, and send the painting back. A painting made from a CC BY or CC BY-SA photo is credited "Painting after a photo by PHOTOGRAPHER, LICENCE".\n\n${rows.join('\n')}\n`,
);
