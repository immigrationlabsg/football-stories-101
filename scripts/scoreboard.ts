/**
 * Scoreboard of the improvement loop (docs/improvement-loop.md sections 1 and 3). Reads the daily snapshots
 * (data/metrics/YYYY-MM-DD.json, written by scripts/insights.ts with SNAPSHOT_FILE) and the register
 * (data/experiments.json), scores every counted post from the first snapshot at least 48 h after it went out, and
 * prints, per test and per network: likes per post, shares (Instagram per 1,000 reached, Facebook per 1,000 plays,
 * Threads reposts + shares per 1,000 views), followers, early signs, each against the baseline and the week before,
 * the split by format, and the keep / extend / drop verdict by the section 3 rule. It adds the numbers so nobody
 * adds by hand; it decides nothing: the master session decides and the growth-verifier checks.
 * Read-only. Runs cleanly with no snapshots ("not enough data").
 *
 *   npm run scoreboard
 *   npm run scoreboard -- --metrics DIR --experiments FILE --stories DIR --now 2026-11-27T05:00:00Z   (for the fixture test)
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { ROOT } from './lib/stories';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const METRICS = path.resolve(opt('metrics', path.join(ROOT, 'data/metrics')));
const EXPERIMENTS = path.resolve(opt('experiments', path.join(ROOT, 'data/experiments.json')));
const STORIES = path.resolve(opt('stories', path.join(ROOT, 'src/content/stories')));
const NOW = Date.parse(opt('now', process.env.SCOREBOARD_NOW ?? new Date().toISOString()));
const H = 3_600_000;
const NETWORKS = ['facebook', 'instagram', 'threads'] as const;
type Network = (typeof NETWORKS)[number];

// ---------- helpers ----------
const out: string[] = [];
const say = (s = '') => out.push(s);
const nums = (a: (number | null | undefined)[]) => a.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const median = (a: number[]) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const f1 = (x: number | null) => (x === null ? '-' : Number.isInteger(x) ? String(x) : x.toFixed(1));
const f2 = (x: number | null) => (x === null ? '-' : Number.isInteger(x) ? String(x) : x.toFixed(2));
const parseTs = (s: unknown): number | null => {
  if (typeof s !== 'string') return null;
  const t = Date.parse(s.replace(/([+-]\d\d)(\d\d)$/, '$1:$2')); // Instagram writes +0000
  return Number.isFinite(t) ? t : null;
};
const sgtDate = (ms: number) => new Date(ms + 8 * H).toISOString().slice(0, 10);
const sgtMidnight = (d: string) => Date.parse(`${d}T00:00:00+08:00`);

// ---------- load ----------
interface Snap {
  file: string;
  date: string;
  readAt: number;
  data: any;
}
const snaps: Snap[] = [];
if (fs.existsSync(METRICS)) {
  for (const file of fs.readdirSync(METRICS).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(METRICS, file), 'utf8'));
      const readAt = Date.parse(data.read_at);
      if (!Number.isFinite(readAt)) throw new Error('no read_at');
      snaps.push({ file, date: file.slice(0, 10), readAt, data });
    } catch (e) {
      say(`WARNING: could not read ${file}: ${(e as Error).message}`);
    }
  }
}
snaps.sort((a, b) => a.readAt - b.readAt);

const register = fs.existsSync(EXPERIMENTS) ? JSON.parse(fs.readFileSync(EXPERIMENTS, 'utf8')) : { entries: [] };
const entries: any[] = register.entries ?? [];

// Story formats and tags, read from the story files.
const storyInfo = new Map<number, { format: string; feeling?: string; opening?: string }>();
if (fs.existsSync(STORIES)) {
  for (const f of fs.readdirSync(STORIES).filter((x) => /\.mdx?$/.test(x))) {
    try {
      const d = matter(fs.readFileSync(path.join(STORIES, f), 'utf8')).data as any;
      if (typeof d.number !== 'number') continue;
      const format = d.format === 'quiz' || d.series === 'Guess the legend' ? 'quiz' : d.series === 'On this day' ? 'comparison' : d.lineup ? 'legendary-xi' : 'regular';
      storyInfo.set(d.number, { format, feeling: d.feeling, opening: d.opening });
    } catch {
      /* a story that cannot be parsed is reported by npm run validate */
    }
  }
}
const formatOf = (story: number | null) => (story === null ? 'unmapped' : storyInfo.get(story)?.format ?? 'unknown');

// ---------- normalise every post row of every snapshot ----------
interface Obs {
  snap: Snap;
  likes: number | null;
  comments: number | null;
  shares: number | null; // network's share count (Threads: reposts + shares)
  reposts: number | null;
  denom: number | null; // Instagram reach, Facebook plays, Threads views
  reach: number | null;
  views: number | null;
  skip: number | null; // percent
  watchS: number | null;
}
interface Post {
  key: string;
  network: Network;
  id: string;
  story: number | null;
  ts: number;
  obs: Obs[];
}
const posts = new Map<string, Post>();
const n = (v: any): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
function add(network: Network, snap: Snap, r: any, o: Omit<Obs, 'snap'>) {
  const ts = parseTs(r.timestamp);
  if (!r.id || ts === null) return;
  const key = `${network}|${r.id}`;
  let p = posts.get(key);
  if (!p) posts.set(key, (p = { key, network, id: String(r.id), story: null, ts, obs: [] }));
  if (typeof r.story === 'number') p.story = r.story;
  p.obs.push({ snap, ...o });
}
for (const snap of snaps) {
  const d = snap.data;
  const reelStories = new Set<number>();
  for (const r of d.facebook?.reels ?? []) {
    if (typeof r.story === 'number') reelStories.add(r.story);
    add('facebook', snap, r, { likes: n(r.likes), comments: n(r.comments), shares: n(r.shares), reposts: null, denom: n(r.views), reach: null, views: n(r.views), skip: null, watchS: n(r.avg_watch_s) });
  }
  for (const r of d.facebook?.posts ?? []) {
    if (typeof r.story === 'number' && reelStories.has(r.story)) continue; // the Reel row already stands for this story
    add('facebook', snap, r, { likes: n(r.likes), comments: n(r.comments), shares: n(r.shares), reposts: null, denom: n(r.views), reach: n(r.reach), views: n(r.views), skip: null, watchS: null });
  }
  for (const r of d.instagram?.posts ?? []) {
    add('instagram', snap, r, { likes: n(r.likes), comments: n(r.comments), shares: n(r.shares), reposts: null, denom: n(r.reach), reach: n(r.reach), views: n(r.views), skip: n(r.skip_rate), watchS: n(r.avg_watch_ms) === null ? null : n(r.avg_watch_ms)! / 1000 });
  }
  for (const r of d.threads?.posts ?? []) {
    const rp = n(r.reposts);
    const sh = n(r.shares);
    add('threads', snap, r, { likes: n(r.likes), comments: n(r.comments), shares: rp === null && sh === null ? null : (rp ?? 0) + (sh ?? 0), reposts: rp, denom: n(r.views), reach: null, views: n(r.views), skip: null, watchS: null });
  }
}

// ---------- scoring ----------
interface Scored {
  post: Post;
  unit: string; // story number, or the post key for posts with no story (Threads text takes)
  format: string;
  obs: Obs;
  ageH: number;
}
interface Group {
  scored: Scored[];
  unscored: { post: Post; reason: string }[];
  storiesExpected: number[];
  storiesMissing: number[];
}
const inRange = (s: number | null, r?: { from: number; to: number } | null) => s !== null && !!r && s >= r.from && s <= r.to;
const excludedStory = (s: number | null, spec?: string) => {
  const m = /^(\d+)-(\d+)$/.exec(spec ?? '');
  return s !== null && !!m && s >= Number(m[1]) && s <= Number(m[2]);
};

function buildGroup(entry: any, stories: { from: number; to: number } | null | undefined, scoreAt: any, opts: { unmapped: boolean }): Group {
  const nets: string[] = entry.networks ?? [...NETWORKS];
  const g: Group = { scored: [], unscored: [], storiesExpected: [], storiesMissing: [] };
  if (!stories) return g;
  for (let s = stories.from; s <= stories.to; s++) g.storiesExpected.push(s);
  for (const p of posts.values()) {
    if (!nets.includes(p.network)) continue;
    const mapped = inRange(p.story, stories) && !excludedStory(p.story, entry.excludeStories);
    const unmapped = opts.unmapped && p.story === null && entry.start && entry.end && sgtDate(p.ts) >= entry.start && sgtDate(p.ts) <= entry.end;
    if (!mapped && !unmapped) continue;
    let obs: Obs | undefined;
    let reason = '';
    if (scoreAt?.mode === 'latest') {
      const cands = p.obs.filter((o) => !scoreAt.notAfter || o.snap.date <= scoreAt.notAfter);
      obs = cands[cands.length - 1];
      reason = 'not in any snapshot';
    } else {
      obs = p.obs.find((o) => o.snap.readAt - p.ts >= 48 * H);
      const latest = snaps[snaps.length - 1];
      reason = !latest ? 'no snapshots' : latest.readAt - p.ts < 48 * H ? `too young (${f1((latest.readAt - p.ts) / H)} h at the latest snapshot)` : 'no snapshot at least 48 h after posting contains it';
    }
    if (!obs) g.unscored.push({ post: p, reason });
    else g.scored.push({ post: p, unit: p.story !== null ? String(p.story) : p.key, format: formatOf(p.story), obs, ageH: (obs.snap.readAt - p.ts) / H });
  }
  const have = new Set(g.scored.filter((x) => x.post.story !== null).map((x) => x.post.story));
  g.storiesMissing = g.storiesExpected.filter((s) => !have.has(s));
  return g;
}

// ---------- aggregates ----------
interface Agg {
  posts: number;
  units: number;
  likesMean: number | null;
  likesMedian: number | null;
  likesTotal: number;
  unitLikes: number[];
  byNet: Record<string, NetAgg>;
  sharesTotal: number;
  postsWithShares: number;
}
interface NetAgg {
  posts: number;
  likes: number[];
  likesTotal: number;
  sharesTotal: number;
  postsWithShares: number;
  rate: number | null; // pooled shares per 1,000 of the denominator
  rateMedian: number | null;
  denomMedian: number | null; // reach (Instagram), plays (Facebook), views (Threads)
  skipMean: number | null;
  watchMean: number | null;
  likesPlusReposts: number;
}
function aggregate(scored: Scored[]): Agg {
  const unitLikes = new Map<string, number>();
  const byNet: Record<string, NetAgg> = {};
  let sharesTotal = 0;
  let postsWithShares = 0;
  for (const s of scored) {
    const o = s.obs;
    if (o.likes !== null) unitLikes.set(s.unit, (unitLikes.get(s.unit) ?? 0) + o.likes);
    else if (!unitLikes.has(s.unit)) unitLikes.set(s.unit, 0);
    const b = (byNet[s.post.network] ??= { posts: 0, likes: [], likesTotal: 0, sharesTotal: 0, postsWithShares: 0, rate: null, rateMedian: null, denomMedian: null, skipMean: null, watchMean: null, likesPlusReposts: 0 });
    b.posts++;
    if (o.likes !== null) {
      b.likes.push(o.likes);
      b.likesTotal += o.likes;
    }
    b.likesPlusReposts += (o.likes ?? 0) + (o.reposts ?? 0);
    if (o.shares) {
      b.sharesTotal += o.shares;
      b.postsWithShares++;
      sharesTotal += o.shares;
      postsWithShares++;
    }
  }
  for (const [net, b] of Object.entries(byNet)) {
    const rows = scored.filter((s) => s.post.network === net);
    const pairs = rows.filter((s) => s.obs.shares !== null && s.obs.denom !== null && s.obs.denom > 0);
    const den = pairs.reduce((a, s) => a + s.obs.denom!, 0);
    b.rate = den > 0 ? (pairs.reduce((a, s) => a + s.obs.shares!, 0) / den) * 1000 : null;
    b.rateMedian = median(pairs.map((s) => (s.obs.shares! / s.obs.denom!) * 1000));
    b.denomMedian = median(nums(rows.map((s) => s.obs.denom)));
    b.skipMean = mean(nums(rows.map((s) => s.obs.skip)));
    b.watchMean = mean(nums(rows.map((s) => s.obs.watchS)));
  }
  const ul = [...unitLikes.values()];
  return { posts: scored.length, units: ul.length, likesMean: mean(ul), likesMedian: median(ul), likesTotal: ul.reduce((a, b) => a + b, 0), unitLikes: ul, byNet, sharesTotal, postsWithShares };
}
const DENOM: Record<string, string> = { instagram: 'reached', facebook: 'plays', threads: 'views' };

// ---------- followers ----------
function followersOf(s: Snap, net: Network): number | null {
  return n(s.data?.[net]?.followers);
}
function followerChange(net: Network, start: string, end: string) {
  const withData = snaps.filter((s) => followersOf(s, net) !== null);
  const before = [...withData].reverse().find((s) => s.date < start) ?? withData.find((s) => s.date >= start);
  const after = [...withData].reverse().find((s) => s.date <= end);
  if (!before || !after || before === after) return null;
  return { from: followersOf(before, net)!, to: followersOf(after, net)!, change: followersOf(after, net)! - followersOf(before, net)!, a: before.date, b: after.date };
}
function followerTrend(net: Network) {
  const withData = snaps.filter((s) => followersOf(s, net) !== null);
  if (withData.length < 2) return null;
  const last = withData[withData.length - 1];
  const cutoff = sgtMidnight(last.date) - 28 * 24 * H;
  const first = withData.find((s) => sgtMidnight(s.date) >= cutoff) ?? withData[0];
  if (first === last) return null;
  const days = Math.round((sgtMidnight(last.date) - sgtMidnight(first.date)) / (24 * H));
  return { from: followersOf(first, net)!, to: followersOf(last, net)!, change: followersOf(last, net)! - followersOf(first, net)!, days, a: first.date, b: last.date };
}

// ---------- verdict ----------
interface Leg {
  name: string;
  status: 'pass' | 'fail' | 'n/a';
  detail: string;
}
const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 'baseline 0' : 'same') : `${a >= b ? '+' : ''}${(((a - b) / b) * 100).toFixed(0)}%`);

function evaluate(entry: any, test: Agg, refs: { baseline: Agg | null; previous: Agg | null }): { legs: Leg[]; early: string; earlyBad: boolean } {
  const bar = entry.bar ?? {};
  const legs: Leg[] = [];
  const ref = (which: string) => (which === 'previous' ? refs.previous : refs.baseline);
  const refLabel = (which: string) => (which === 'previous' ? entry.compare?.previous?.label ?? 'the previous period' : 'the baseline');

  if (bar.likesPerPost) {
    const r = ref(bar.likesPerPost.against);
    if (!r || r.likesMean === null || test.likesMean === null) legs.push({ name: 'likes per post', status: 'n/a', detail: `no scored posts for ${refLabel(bar.likesPerPost.against)} or for the test` });
    else {
      const need = r.likesMean * (1 + bar.likesPerPost.pctAbove / 100);
      let ok = test.likesMean > need;
      let note = '';
      const med = test.likesMedian ?? 0;
      if (ok && med >= 1) {
        const kept = test.unitLikes.filter((x) => x <= 3 * med);
        const meanWithout = mean(kept);
        if (kept.length < test.unitLikes.length && meanWithout !== null && !(meanWithout > need)) {
          ok = false;
          note = ` (clears the bar only because of a post over 3 times the median of ${f1(med)}: it cannot decide a test alone)`;
        }
      }
      legs.push({ name: 'likes per post', status: ok ? 'pass' : 'fail', detail: `${f2(test.likesMean)} vs ${f2(r.likesMean)} in ${refLabel(bar.likesPerPost.against)} (${pct(test.likesMean, r.likesMean)}; bar +${bar.likesPerPost.pctAbove}%, needs more than ${f2(need)})${note}` });
    }
  }
  if (bar.shares) {
    const r = ref(bar.shares.ratesAbove);
    const enough = test.sharesTotal >= bar.shares.minShares && test.postsWithShares >= bar.shares.minPosts;
    let above = 0;
    let below = 0;
    const parts: string[] = [];
    for (const net of NETWORKS) {
      const t = test.byNet[net]?.rate ?? null;
      const b = r?.byNet[net]?.rate ?? null;
      if (t === null || b === null) continue;
      if (t > b) above++;
      else if (t < b) below++;
      parts.push(`${net} ${f2(t)} vs ${f2(b)}`);
    }
    const rateOk = above >= 1 && above >= below;
    const ok = enough && rateOk;
    const shortOf = enough ? '' : `; the bar needs at least ${bar.shares.minShares} shares from ${bar.shares.minPosts}+ posts and there are ${test.sharesTotal} from ${test.postsWithShares}`;
    legs.push({ name: 'shares', status: !r ? 'n/a' : ok ? 'pass' : 'fail', detail: `${test.sharesTotal} shares from ${test.postsWithShares} posts; per 1,000 ${parts.join(', ') || 'no comparable rates'}${shortOf}${enough && !rateOk ? '; rate not above the reference' : ''}` });
  }
  if (bar.skipRatePointsDown) {
    const r = ref(bar.skipRatePointsDown.against);
    const t = test.byNet.instagram?.skipMean ?? null;
    const b = r?.byNet.instagram?.skipMean ?? null;
    if (t === null || b === null) legs.push({ name: 'Instagram skip rate', status: 'n/a', detail: 'no skip rate readings for the test or the reference' });
    else legs.push({ name: 'Instagram skip rate', status: b - t >= bar.skipRatePointsDown.points ? 'pass' : 'fail', detail: `${f1(t)}% vs ${f1(b)}% in ${refLabel(bar.skipRatePointsDown.against)} (down ${f1(b - t)} points; bar ${bar.skipRatePointsDown.points})` });
  }
  if (bar.threadsLikesPlusRepostsMin !== undefined) {
    const t = test.byNet.threads;
    if (!t) legs.push({ name: 'Threads likes + reposts', status: 'n/a', detail: 'no scored Threads posts' });
    else legs.push({ name: 'Threads likes + reposts', status: t.likesPlusReposts >= bar.threadsLikesPlusRepostsMin ? 'pass' : 'fail', detail: `${t.likesPlusReposts} in the week (bar at least ${bar.threadsLikesPlusRepostsMin})` });
  }
  if (bar.threadsViewsMedianAbove) {
    const r = ref(bar.threadsViewsMedianAbove);
    const t = test.byNet.threads?.denomMedian ?? null;
    const b = r?.byNet.threads?.denomMedian ?? null;
    if (t === null || b === null) legs.push({ name: 'Threads views per post', status: 'n/a', detail: 'no Threads views for the test or the reference' });
    else legs.push({ name: 'Threads views per post', status: t > b ? 'pass' : 'fail', detail: `median ${f1(t)} vs ${f1(b)} in ${refLabel(bar.threadsViewsMedianAbove)}` });
  }

  // Early signs (reach, skip rate, average watch), Instagram, against the reference of the first leg's bar.
  const against = bar.likesPerPost?.against ?? bar.skipRatePointsDown?.against ?? 'baseline';
  const r = ref(against);
  const ti = test.byNet.instagram;
  const ri = r?.byNet.instagram;
  const signs: string[] = [];
  let better = 0;
  let worse = 0;
  const cmp = (label: string, t: number | null | undefined, b: number | null | undefined, higherIsBetter: boolean) => {
    if (t === null || t === undefined || b === null || b === undefined) return;
    const d = higherIsBetter ? t - b : b - t;
    if (d > 0) better++;
    else if (d < 0) worse++;
    signs.push(`${label} ${f1(t)} vs ${f1(b)} (${d > 0 ? 'better' : d < 0 ? 'worse' : 'same'})`);
  };
  cmp('Instagram reach (median)', ti?.denomMedian, ri?.denomMedian, true);
  cmp('skip rate %', ti?.skipMean, ri?.skipMean, false);
  cmp('average watch s', ti?.watchMean, ri?.watchMean, true);
  return { legs, early: signs.length ? signs.join('; ') : 'not available', earlyBad: worse > better };
}

// ---------- print ----------
say('# Scoreboard');
say('');
say(`Read: ${new Date(NOW).toISOString()}. Snapshots in ${path.relative(ROOT, METRICS) || METRICS}: ${snaps.length}.`);
if (snaps.length) {
  say(`First ${snaps[0].date}, latest ${snaps[snaps.length - 1].date} (read ${new Date(snaps[snaps.length - 1].readAt).toISOString()}).`);
  const missing: string[] = [];
  const have = new Set(snaps.map((s) => s.date));
  for (let t = sgtMidnight(snaps[0].date); t <= sgtMidnight(snaps[snaps.length - 1].date); t += 24 * H) {
    const d = sgtDate(t);
    if (!have.has(d)) missing.push(d);
  }
  say(missing.length ? `MISSING DAYS: ${missing.join(', ')} (the report lists only the last 15 posts per network, so a gap must be caught up the next day).` : 'No missing days between the first and latest snapshot.');
} else {
  say('No snapshots yet: nothing can be scored. Run the "Metrics snapshot" workflow (13:00 Singapore daily).');
}
say('Scores: likes per post = Instagram likes + Facebook reactions + Threads likes for each story, scored at 48 h; shares per 1,000: Instagram reached, Facebook plays, Threads views (reposts + shares).');
say('Verdict uses the mean likes per post (as the baseline in the plan is a mean); the median is shown beside it. Followers are reported, never judged on one test week.');

const byId = new Map(entries.map((e) => [e.id, e]));
const baselineEntry = entries.find((e) => e.kind === 'baseline');
let baselineGroup: Group | null = null;
let baselineAgg: Agg | null = null;
let baselineProvisional = false;
if (baselineEntry?.counted?.stories) {
  baselineGroup = buildGroup(baselineEntry, baselineEntry.counted.stories, baselineEntry.scoreAt, { unmapped: false });
  baselineAgg = baselineGroup.scored.length ? aggregate(baselineGroup.scored) : null;
  const lastDate = snaps.length ? snaps[snaps.length - 1].date : '';
  baselineProvisional = !!baselineEntry.scoreAt?.notAfter && lastDate < baselineEntry.scoreAt.notAfter;
}

const row = (cells: string[]) => `| ${cells.join(' | ')} |`;
function scoreTable(cols: { label: string; agg: Agg | null }[], nets: string[]) {
  const head = ['Score', ...cols.map((c) => c.label)];
  say(row(head));
  say(row(head.map(() => '---')));
  const cell = (f: (a: Agg) => string) => cols.map((c) => (c.agg ? f(c.agg) : 'no data'));
  say(row(['Stories scored', ...cell((a) => String(a.units))]));
  say(row(['Likes per post, all networks (mean / median)', ...cell((a) => `${f2(a.likesMean)} / ${f1(a.likesMedian)}`)]));
  for (const net of nets) {
    say(row([`${net}: posts scored`, ...cell((a) => String(a.byNet[net]?.posts ?? 0))]));
    say(row([`${net}: likes per post (mean / median)`, ...cell((a) => { const b = a.byNet[net]; return b?.likes.length ? `${f2(mean(b.likes))} / ${f1(median(b.likes))}` : '-'; })]));
    say(row([`${net}: shares (total, posts with a share)`, ...cell((a) => { const b = a.byNet[net]; return b ? `${b.sharesTotal}, ${b.postsWithShares}` : '-'; })]));
    say(row([`${net}: shares per 1,000 ${DENOM[net]} (pooled / median post)`, ...cell((a) => { const b = a.byNet[net]; return b ? `${f2(b.rate)} / ${f2(b.rateMedian)}` : '-'; })]));
    if (net === 'instagram') {
      say(row(['instagram: reach, median', ...cell((a) => f1(a.byNet.instagram?.denomMedian ?? null))]));
      say(row(['instagram: skip rate %, mean', ...cell((a) => f1(a.byNet.instagram?.skipMean ?? null))]));
      say(row(['instagram: average watch s, mean', ...cell((a) => f1(a.byNet.instagram?.watchMean ?? null))]));
    }
    if (net === 'facebook') say(row(['facebook: plays, median', ...cell((a) => f1(a.byNet.facebook?.denomMedian ?? null))]));
    if (net === 'threads') say(row(['threads: views, median', ...cell((a) => f1(a.byNet.threads?.denomMedian ?? null))]));
  }
}
function formatSplit(g: Group) {
  const by = new Map<string, Scored[]>();
  for (const s of g.scored) by.set(s.format, [...(by.get(s.format) ?? []), s]);
  if (!by.size) return;
  say('');
  say('Split by format (this period):');
  say(row(['Format', 'Stories', 'Likes per post (mean)', 'Shares (all networks)']));
  say(row(['---', '---', '---', '---']));
  for (const [fmt, list] of [...by.entries()].sort()) {
    const a = aggregate(list);
    say(row([fmt, String(a.units), f2(a.likesMean), String(a.sharesTotal)]));
  }
}

for (const e of entries) {
  say('');
  const dates = e.start ? `${e.start} to ${e.end}` : 'dates not set';
  say(`## ${e.kind === 'baseline' ? e.name : `${e.name} (${e.id})`} [${e.status}; ${dates}]`);
  say(`Change: ${e.change}`);
  if (!e.counted?.stories) {
    say('Not scheduled yet: no counted stories in the register. Nothing to score.');
    continue;
  }
  say(`Counted: ${e.counted.rule}`);
  const nets: string[] = e.networks ?? [...NETWORKS];

  const mine = e.kind === 'baseline' ? baselineGroup! : buildGroup(e, e.counted.stories, e.scoreAt, { unmapped: !!e.counted.includeUnmappedInWindow });
  const myAgg = mine.scored.length ? aggregate(mine.scored) : null;
  const prevStories = e.compare?.previous?.stories ?? null;
  const prevGroup = prevStories ? buildGroup(e, prevStories, undefined, { unmapped: false }) : null;
  const prevAgg = prevGroup?.scored.length ? aggregate(prevGroup.scored) : null;

  say(`Scored: ${mine.scored.length} posts (${myAgg?.units ?? 0} of ${mine.storiesExpected.length} counted stories${mine.storiesMissing.length ? `; no 48 h score yet for stories ${mine.storiesMissing.map((s) => String(s).padStart(3, '0')).join(', ')}` : ''}).`);
  for (const u of mine.unscored.slice(0, 12)) say(`  not scored: ${u.post.network} ${u.post.id} (story ${u.post.story ?? '?'}): ${u.reason}`);
  if (e.kind === 'baseline') say(baselineProvisional ? `PROVISIONAL: the baseline locks on ${e.scoreAt.notAfter} (trial report); until then it is read from the latest snapshot at whatever age the posts are.` : 'Baseline locked.');

  const cols: { label: string; agg: Agg | null }[] = [{ label: e.kind === 'baseline' ? 'This period' : 'This test', agg: myAgg }];
  if (e.kind !== 'baseline') {
    cols.push({ label: baselineProvisional ? 'Baseline (provisional)' : 'Baseline (trial 8-16 Nov)', agg: baselineAgg });
    cols.push({ label: e.compare?.previous?.label ?? 'Previous period', agg: prevAgg });
  }
  if (!snaps.length) {
    say('');
    say('Not enough data: no snapshots yet.');
    if (e.kind !== 'baseline' && e.start && NOW >= sgtMidnight(e.start)) say('Verdict: NOT ENOUGH DATA (no snapshots).');
    else if (e.kind !== 'baseline') say(`Verdict: NOT STARTED (the test begins ${e.start}).`);
    continue;
  }
  say('');
  scoreTable(cols, nets);
  if (prevGroup && prevGroup.storiesMissing.length && prevAgg) say(`(previous period: no 48 h score yet for stories ${prevGroup.storiesMissing.join(', ')})`);

  if (e.start && e.end) {
    say('');
    say('Followers (reported; judged only on the 4-week trend):');
    for (const net of NETWORKS) {
      const c = followerChange(net, e.start, e.end);
      const t = followerTrend(net);
      say(`- ${net}: ${c ? `${c.from} -> ${c.to} (${c.change >= 0 ? '+' : ''}${c.change}) from ${c.a} to ${c.b}` : 'no change readable yet'}; 4-week trend: ${t ? `${t.change >= 0 ? '+' : ''}${t.change} over ${t.days} days (${t.a} to ${t.b})` : 'not enough snapshots'}`);
    }
  }
  if (e.kind !== 'baseline') formatSplit(mine);

  if (e.kind === 'baseline') continue;

  // Verdict.
  say('');
  const startMs = e.start ? sgtMidnight(e.start) : Infinity;
  if (NOW < startMs) {
    say(`Verdict: NOT STARTED (the test begins ${e.start}).`);
    continue;
  }
  if (!e.bar) {
    say('Verdict: no bar in the register: set it before the week starts.');
    continue;
  }
  if (!myAgg || !baselineAgg) {
    say(`Verdict: NOT ENOUGH DATA (${!myAgg ? 'no counted post has a 48 h score yet' : 'the baseline has no scored posts yet'}).`);
    continue;
  }
  if (mine.storiesMissing.length) {
    say(`Verdict: NOT ENOUGH DATA (scored ${myAgg.units} of ${mine.storiesExpected.length} counted stories; the rest are not yet 48 h old or are missing from the snapshots).`);
    continue;
  }
  const { legs, early, earlyBad } = evaluate(e, myAgg, { baseline: baselineAgg, previous: prevAgg });
  say('Bar:');
  for (const l of legs) say(`- ${l.name}: ${l.status.toUpperCase()}: ${l.detail}`);
  say(`Early signs (explain, never decide alone): ${early}`);
  const nd = legs.filter((l) => l.status === 'n/a');
  let verdict: string;
  if (nd.length) verdict = `NOT ENOUGH DATA (${nd.map((l) => l.name).join(', ')} cannot be read yet)`;
  else if (legs.every((l) => l.status === 'pass')) verdict = earlyBad ? 'EXTEND once: the bar is cleared but the early signs move the other way' : `KEEP: the bar is cleared${early === 'not available' ? ' (early signs not available)' : ' and the early signs agree'}`;
  else if (legs.every((l) => l.status === 'fail')) verdict = 'DROP: misses on every part of the bar';
  else verdict = e.extended ? 'DROP: still unclear after the one extension' : 'EXTEND one more week once (the queue moves back one week), then drop if still unclear';
  say(`Verdict (for the master session to confirm; a post over 3 times the median never decides alone): ${verdict}.`);
}

if (!entries.length) say('\nNo entries in the register (data/experiments.json).');
void byId;
console.log(out.join('\n'));
