/**
 * Checks `npm run scoreboard` on made-up sample data in a temporary folder (nothing is written to data/metrics):
 * no snapshots, one snapshot, a test that should be kept, one that should be dropped and one that should be extended.
 *
 *   npm run scoreboard:test
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fs101-scoreboard-'));
const DAY = 86_400_000;
const day1 = Date.parse('2026-11-08T00:00:00Z'); // story 20
const tsOf = (story: number) => day1 + (story - 20) * DAY;
const failures: string[] = [];

type Plan = { igLikes: (s: number) => number; fbLikes: (s: number) => number; thLikes: (s: number) => number; igShares: (s: number) => number; skip: (s: number) => number };

function writeStories(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  const put = (n: number, extra: string) => fs.writeFileSync(path.join(dir, `${String(n).padStart(3, '0')}-x.mdx`), `---\nnumber: ${n}\n${extra}\n---\nbody\n`);
  for (let n = 20; n <= 45; n++) put(n, n === 35 ? 'format: quiz' : n === 37 ? 'series: "On this day"' : 'series: null');
}

function writeSnapshots(dir: string, plan: Plan, from: string, to: string) {
  fs.mkdirSync(dir, { recursive: true });
  for (let t = Date.parse(`${from}T05:00:00Z`); t <= Date.parse(`${to}T05:00:00Z`); t += DAY) {
    const stories = [];
    for (let s = 20; s <= 45; s++) if (tsOf(s) <= t && t - tsOf(s) < 15 * DAY) stories.push(s);
    const ig = stories.map((s) => ({
      id: `ig${s}`, story: s, timestamp: new Date(tsOf(s)).toISOString().replace('.000Z', '+0000'), likes: plan.igLikes(s), comments: 0, shares: plan.igShares(s), saves: 0, reposts: null,
      reach: 100, views: 120, follows: null, avg_watch_ms: 6000, total_watch_ms: 1, skip_rate: plan.skip(s),
    }));
    const fb = stories.map((s) => ({ id: `fb${s}`, story: s, timestamp: new Date(tsOf(s)).toISOString(), likes: plan.fbLikes(s), comments: 0, shares: 0, saves: null, reposts: null, reach: null, views: 50, views_incl_replays: 60, avg_watch_s: 5, skip_rate: null }));
    const th = stories.map((s) => ({ id: `th${s}`, story: s, timestamp: new Date(tsOf(s)).toISOString(), likes: plan.thLikes(s), comments: 0, shares: 0, saves: null, reposts: 0, reach: null, views: 20, avg_watch_s: null, skip_rate: null }));
    const date = new Date(t).toISOString().slice(0, 10);
    fs.writeFileSync(
      path.join(dir, `${date}.json`),
      JSON.stringify({ schema: 1, read_at: new Date(t).toISOString(), facebook: { followers: 1, page_likes: 1, reels: fb, posts: [] }, instagram: { followers: 0, posts: ig }, threads: { followers: 0, posts: th } }),
    );
  }
}

const experiments = {
  entries: [
    { id: 'baseline', kind: 'baseline', name: 'Trial baseline', status: 'planned', start: '2026-11-08', end: '2026-11-17', change: 'trial', counted: { stories: { from: 20, to: 28 }, rule: 'stories 20-28' }, scoreAt: { mode: 'latest', notAfter: '2026-11-18' }, excludeStories: '900-908' },
    {
      id: 'test-1', kind: 'test', name: 'Test 1', status: 'planned', start: '2026-11-23', end: '2026-11-29', change: 'feeling', counted: { stories: { from: 35, to: 41 }, rule: 'stories 35-41' }, excludeStories: '900-908',
      compare: { previous: { stories: { from: 28, to: 34 }, label: 'the week before' } },
      bar: { likesPerPost: { pctAbove: 30, against: 'baseline' }, shares: { minShares: 3, minPosts: 2, ratesAbove: 'baseline' } },
    },
  ],
};
const expFile = path.join(root, 'experiments.json');
fs.writeFileSync(expFile, JSON.stringify(experiments));
const stories = path.join(root, 'stories');
writeStories(stories);

function run(name: string, metrics: string, now: string, expect: string[], reject: string[] = []) {
  const text = execFileSync('npx', ['tsx', 'scripts/scoreboard.ts', '--metrics', metrics, '--experiments', expFile, '--stories', stories, '--now', now], { encoding: 'utf8' });
  for (const e of expect) if (!text.includes(e)) failures.push(`${name}: expected "${e}"`);
  for (const r of reject) if (text.includes(r)) failures.push(`${name}: did not expect "${r}"`);
  if (process.env.SHOW) console.log(`\n===== ${name} =====\n${text}`);
  return text;
}

// 1. No snapshots at all (the folder does not even exist).
run('no snapshots', path.join(root, 'none'), '2026-11-30T00:00:00Z', ['Snapshots in', ': 0.', 'Not enough data', 'NOT ENOUGH DATA (no snapshots)']);

// 2. One snapshot only: the test posts are not yet 48 h old.
const one = path.join(root, 'one');
writeSnapshots(one, { igLikes: () => 2, fbLikes: () => 0, thLikes: () => 0, igShares: () => 0, skip: () => 55 }, '2026-11-10', '2026-11-10');
run('one snapshot', one, '2026-11-30T00:00:00Z', ['Snapshots in', ': 1.', 'NOT ENOUGH DATA']);

// 3. A test that clears its bar: more likes, 3 shares from 2 posts, skip rate down.
const keep = path.join(root, 'keep');
writeSnapshots(keep, { igLikes: (s) => (s >= 35 && s <= 41 ? 4 : 2), fbLikes: (s) => (s >= 35 && s <= 41 ? 1 : 0), thLikes: (s) => (s >= 35 && s <= 41 ? 1 : 0), igShares: (s) => (s === 36 ? 2 : s === 38 ? 1 : 0), skip: (s) => (s >= 35 && s <= 41 ? 50 : 55) }, '2026-11-10', '2026-12-03');
const keepText = run('keep', keep, '2026-12-02T05:00:00Z', ['Verdict', 'KEEP: the bar is cleared and the early signs agree', 'likes per post: PASS', 'shares: PASS', '3 shares from 2 posts', 'quiz', 'comparison', 'No missing days'], ['MISSING DAYS']);
if (!/Stories scored \| 7 \| 9 \| 7/.test(keepText)) failures.push('keep: expected 7 test stories, 9 baseline stories and 7 previous-week stories scored');

// 4. A test that misses on likes and shares: dropped.
const drop = path.join(root, 'drop');
writeSnapshots(drop, { igLikes: (s) => (s >= 35 && s <= 41 ? 1 : 2), fbLikes: () => 0, thLikes: () => 0, igShares: () => 0, skip: () => 55 }, '2026-11-10', '2026-12-03');
run('drop', drop, '2026-12-02T05:00:00Z', ['DROP: misses on every part of the bar', 'likes per post: FAIL', 'shares: FAIL']);

// 5. Likes clear the bar but there are only 2 shares: extended once, not kept.
const extend = path.join(root, 'extend');
writeSnapshots(extend, { igLikes: (s) => (s >= 35 && s <= 41 ? 4 : 2), fbLikes: () => 0, thLikes: () => 0, igShares: (s) => (s === 36 ? 2 : 0), skip: () => 55 }, '2026-11-10', '2026-12-03');
run('extend', extend, '2026-12-02T05:00:00Z', ['EXTEND one more week', 'likes per post: PASS', 'shares: FAIL']);

// 6. A missing day is reported.
const gap = path.join(root, 'gap');
writeSnapshots(gap, { igLikes: () => 2, fbLikes: () => 0, thLikes: () => 0, igShares: () => 0, skip: () => 55 }, '2026-11-10', '2026-11-14');
fs.rmSync(path.join(gap, '2026-11-12.json'));
run('missing day', gap, '2026-11-15T00:00:00Z', ['MISSING DAYS: 2026-11-12']);

fs.rmSync(root, { recursive: true, force: true });
if (failures.length) {
  console.error(`Scoreboard fixture FAILED:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('Scoreboard fixture passed: no snapshots, one snapshot, keep, drop, extend and a missing day all behave as the plan says.');
