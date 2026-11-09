/**
 * Checks that every post row in data/metrics/*.json carries the story number that data/sent.json gives its id
 * (scripts/lib/story-ids.ts: the Page id is never a key). Read-only unless --fix, which rewrites only the `story`
 * field of rows whose stored value differs from the recomputed one, nothing else.
 *
 *   npm run metrics:check            list rows whose story differs, exit 1 if any
 *   npm run metrics:check -- --fix   correct them
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/stories';
import { storyForId, storyIdMap } from './lib/story-ids';

const fix = process.argv.includes('--fix');
const sent = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sent.json'), 'utf8')).social;
const map = storyIdMap(sent);
const failures: string[] = [];

// Self-test of the rule that went wrong once: the Page id appears in many Facebook records and maps to no story.
const PAGE = '1419297047928388';
if (map.has(PAGE)) failures.push(`the Page id ${PAGE} is a lookup key (it would give every Facebook post one story)`);
const pair = storyIdMap([{ number: 7, detail: `scheduled for 2026-10-26T00:00:00.000Z ${PAGE}_122094880479522790 (short id 122094880479522790)` }]);
if (storyForId(pair, `${PAGE}_122094880479522790`) !== 7 || storyForId(pair, '122094880479522790') !== 7 || storyForId(pair, `${PAGE}_999999999999999999`) !== null)
  failures.push('"<pageId>_<postId>" is not matched on the full id or the post id only');

const dir = path.join(ROOT, 'data/metrics');
let rows = 0;
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => /^\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort() : []) {
  const file = path.join(dir, f);
  const snap = JSON.parse(fs.readFileSync(file, 'utf8'));
  let changed = 0;
  for (const [net, lists] of [['facebook', ['reels', 'posts']], ['instagram', ['posts']], ['threads', ['posts']]] as const) {
    for (const list of lists) {
      for (const r of snap[net]?.[list] ?? []) {
        rows++;
        const want = storyForId(map, r.id);
        if (r.story !== want) {
          failures.push(`${f}: ${net} ${list} ${r.id}: story ${r.story} should be ${want}`);
          if (fix) {
            r.story = want;
            changed++;
          }
        }
      }
    }
  }
  if (fix && changed) fs.writeFileSync(file, JSON.stringify(snap, null, 2) + '\n');
}
console.log(`${rows} post rows checked against data/sent.json (${map.size} ids known).`);
if (failures.length) {
  console.log(failures.join('\n'));
  if (fix) console.log(`Corrected ${failures.filter((x) => x.includes('should be')).length} row(s).`);
  process.exit(fix ? 0 : 1);
}
console.log('All story numbers match.');
