// Tests for scripts/lib/pushward.ts. Run: npx tsx --test scripts/lib/pushward.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBoard,
  charCount,
  getActivity,
  getQuota,
  LIMITS,
  monthCap,
  pushBoard,
  redact,
  shortNum,
  shouldPush,
  tileLabel,
  truncate,
  validateBoard,
  type BoardContent,
  type FetchLike,
  type ShouldPushInput,
} from './pushward';

const FAKE_KEY = 'hlk_TEST_not_a_real_key_123';
const URL = 'https://example.github.io/live/';
const hasBrokenSurrogate = (s: string) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);
const sgt = (isoLocal: string) => new Date(`${isoLocal}+08:00`).getTime();

// ------------------------------------------------------------ text helpers

test('shortNum formats views compactly and never exceeds 4 characters', () => {
  const cases: [number | null | undefined, string][] = [
    [null, '–'],
    [undefined, '–'],
    [NaN, '–'],
    [-5, '0'],
    [0, '0'],
    [999, '999'],
    [1000, '1k'],
    [1234, '1.2k'],
    [9949, '9.9k'],
    [9950, '10k'],
    [15321, '15k'],
    [999_499, '999k'],
    [999_500, '1m'],
    [1_100_000, '1.1m'],
    [12_345_678, '12m'],
    [2_500_000_000, '2.5b'],
    [1e15, '999b'],
  ];
  for (const [v, want] of cases) assert.equal(shortNum(v), want, `shortNum(${v})`);
  for (let v = 0; v < 3e9; v = Math.floor(v * 1.37) + 1) assert.ok(charCount(shortNum(v)) <= 4, `shortNum(${v}) = ${shortNum(v)}`);
});

test('truncate keeps emoji, flags and skin tones whole', () => {
  assert.equal(truncate('hello', 10), 'hello');
  assert.equal(truncate('  spaced   out  ', 20), 'spaced out');
  assert.equal(truncate('abcdefghij', 5), 'abcd…');
  assert.equal(truncate('abcdefghij', 5, false), 'abcde');
  assert.equal(truncate('abc', 0), '');
  const s = 'Pelé 👍🏽🇸🇬⚽ v Ronaldo 👨‍👩‍👧 forever';
  for (let max = 1; max <= 40; max++) {
    for (const e of [true, false]) {
      const t = truncate(s, max, e);
      assert.ok(charCount(t) <= max && t.length <= max, `max ${max}: "${t}"`);
      assert.ok(!hasBrokenSurrogate(t), `broken surrogate at max ${max}: "${t}"`);
      // whatever is kept (minus the ellipsis) is a prefix of the original made of whole graphemes
      const kept = t.endsWith('…') ? t.slice(0, -1) : t;
      assert.ok(s.startsWith(kept), `not a prefix at max ${max}: "${t}"`);
    }
  }
  // the thumbs-up with skin tone is never split from its modifier
  assert.ok(!truncate('ab👍🏽', 4, false).includes('👍') || truncate('ab👍🏽', 4, false).includes('👍🏽'));
});

test('redact removes the key and anything key-looking', () => {
  const m = redact(`bad ${FAKE_KEY} Bearer xyz hlk_other_key`, FAKE_KEY);
  assert.ok(!m.includes(FAKE_KEY));
  assert.ok(!m.includes('hlk_other_key'));
  assert.ok(!m.includes('xyz'));
});

// ------------------------------------------------------------ board

const stats = {
  instagram: { views: 15321, likes: 1234, shares: 56, comments: 7, followers: 3400 },
  tiktok: { views: 1_100_000, likes: 98_000, shares: 4500, comments: 900, followers: 120_000 },
  youtube: { views: 999, likes: 12, shares: 0, comments: 1, followers: 888 },
  threads: null,
};

test('buildBoard makes four tiles IG/TikTok/YouTube/Threads with views and a compact label', () => {
  const b = buildBoard({ name: 'Lyon', stats, previousViews: { instagram: 10000, tiktok: 1_100_000, youtube: 1200 }, url: URL });
  assert.deepEqual(validateBoard(b), []);
  assert.equal(b.template, 'board');
  assert.equal(b.state, 'Lyon');
  assert.equal(b.tiles.length, 4);
  assert.deepEqual(
    b.tiles.map((t) => t.value),
    ['15k', '1.1m', '999', '–'],
  );
  assert.equal(b.tiles[0].label, 'IG ♥1.2k ↗56 👤3.4k');
  assert.equal(b.tiles[1].label, 'TikTok ♥98k ↗4.5k 👤120k');
  assert.equal(b.tiles[3].label, 'Threads ♥– ↗– 👤–');
  assert.deepEqual(
    b.tiles.map((t) => t.trend),
    ['up', 'flat', 'down', undefined],
  );
  assert.ok(b.tiles.every((t) => t.unit === 'views'));
  // total views 15321 + 1.1m + 999 = 1,116,320 -> "1.1m"
  assert.equal(b.compact_trailing_label, '1.1m');
  assert.equal(b.compact_label, 'FS');
});

test('buildBoard taps: card tap_action, per-tile url_action foreground, never a top-level url_action', () => {
  const b = buildBoard({ name: 'Lyon', stats, url: URL });
  assert.deepEqual(b.tap_action, { url: URL, foreground: true });
  assert.ok(!('url_action' in b));
  for (const t of b.tiles) assert.deepEqual(t.url_action, { url: URL, foreground: true });
  const noUrl = buildBoard({ name: 'Lyon', stats });
  assert.ok(!('tap_action' in noUrl));
  assert.ok(noUrl.tiles.every((t) => !('url_action' in t)));
  const bad = buildBoard({ name: 'Lyon', stats, url: 'javascript:alert(1)' });
  assert.ok(!('tap_action' in bad));
  assert.ok(validateBoard({ ...b, url_action: { url: URL } } as unknown as BoardContent).some((e) => e.includes('url_action')));
});

test('buildBoard with no numbers at all still builds a valid board', () => {
  const b = buildBoard({ name: '', stats: {} });
  assert.deepEqual(validateBoard(b), []);
  assert.equal(b.state, 'Football Stories 101');
  assert.equal(b.compact_trailing_label, '–');
  assert.ok(b.tiles.every((t) => t.value === '–' && t.trend === undefined));
});

test('buildBoard truncates every field to its limit without breaking emoji', () => {
  const longName = '⚽🇧🇷 Pelé v Cristiano Ronaldo 👨‍👩‍👧 '.repeat(20);
  const b = buildBoard({ name: longName, subtitle: '🔥'.repeat(300), stats, url: URL, compactLabel: 'FS101⚽', icon: 'x'.repeat(300) });
  assert.deepEqual(validateBoard(b), []);
  assert.ok(charCount(b.state) <= LIMITS.state && b.state.length <= LIMITS.state);
  assert.ok(b.state.endsWith('…'));
  assert.ok(!hasBrokenSurrogate(b.state) && !hasBrokenSurrogate(b.subtitle ?? ''));
  assert.ok(charCount(b.compact_label) <= 4);
  assert.ok(charCount(b.icon) <= LIMITS.icon);
  for (const t of b.tiles) {
    assert.ok(charCount(t.label) <= LIMITS.tile_label && t.label.length <= LIMITS.tile_label, t.label);
    assert.ok(charCount(t.value) <= LIMITS.tile_value);
    assert.ok(charCount(t.unit ?? '') <= LIMITS.tile_unit);
  }
});

test('tile labels stay within 32 characters at the largest numbers', () => {
  const huge = { views: 9.99e11, likes: 999_999_999, shares: 999_999_999, comments: 1, followers: 999_999_999 };
  for (const p of ['instagram', 'tiktok', 'youtube', 'threads'] as const) {
    const l = tileLabel(p, huge);
    assert.ok(charCount(l) <= 32 && l.length <= 32, l);
    assert.ok(!hasBrokenSurrogate(l));
  }
  const b = buildBoard({ name: 'Big', stats: { instagram: huge, tiktok: huge, youtube: huge, threads: huge } });
  assert.deepEqual(validateBoard(b), []);
  assert.ok(charCount(b.compact_trailing_label) <= 4);
});

test('validateBoard catches each kind of limit breach', () => {
  const good = buildBoard({ name: 'Lyon', stats, url: URL });
  const bad: BoardContent = {
    ...good,
    state: 'x'.repeat(257),
    compact_label: 'FIVE5',
    compact_trailing_label: ' 1k ',
    tiles: [{ label: '', value: 'x'.repeat(17), unit: 'x'.repeat(9) }, ...good.tiles],
  };
  const errs = validateBoard(bad);
  for (const want of ['state longer', 'compact_label longer', 'compact_trailing_label not trimmed', 'tiles[0].label empty', 'tiles[0].value longer', 'tiles[0].unit longer', 'tiles must be 1-4'])
    assert.ok(errs.some((e) => e.includes(want)), `missing "${want}" in ${errs.join(' | ')}`);
  assert.ok(validateBoard({ ...good, state: 'ab\uD83D' }).some((e) => e.includes('broken character')));
});

// ------------------------------------------------------------ schedule

const base = (over: Partial<ShouldPushInput>): ShouldPushInput => ({
  now: 0,
  postedAt: null,
  lastPushes: [],
  plan: 'free',
  storyChanged: false,
  quotaUsedThisMonth: 0,
  ...over,
});

/** Runs the 5-minute cron over one Singapore day and returns the push times (as SGT HH:MM). */
function simulateDay(day: string, postedLocal: string | null, opts: { plan?: 'free' | 'paid'; used?: number; prior?: string[] } = {}) {
  const posted = postedLocal ? sgt(`${day}T${postedLocal}:00`) : null;
  const pushes: string[] = [...(opts.prior ?? [])];
  let used = opts.used ?? 0;
  let storySeen = false;
  const times: string[] = [];
  for (let t = sgt(`${day}T00:00:00`); t < sgt(`${day}T00:00:00`) + 24 * 3600e3; t += 5 * 60e3) {
    const storyChanged = posted != null && t >= posted && !storySeen;
    const d = shouldPush({ now: t, postedAt: posted != null && t >= posted ? posted : null, lastPushes: pushes, plan: opts.plan ?? 'free', storyChanged, quotaUsedThisMonth: used, quotaFromApi: true });
    if (d.push) {
      pushes.push(new Date(t).toISOString());
      used++;
      if (storyChanged) storySeen = true;
      times.push(new Date(t + 8 * 3600e3).toISOString().slice(11, 16));
    }
  }
  return { times, pushes, used };
}

test('free plan weekday 08:00 Reel: 8 updates at the moments the numbers move', () => {
  const { times } = simulateDay('2026-11-12', '08:00');
  assert.deepEqual(times, ['08:00', '08:15', '08:30', '09:00', '10:00', '11:00', '13:00', '15:00']);
});

test('free plan weekend 10:00 Reel: same shape shifted to 10:00', () => {
  const { times } = simulateDay('2026-11-14', '10:00'); // Saturday
  assert.deepEqual(times, ['10:00', '10:15', '10:30', '11:00', '12:00', '13:00', '15:00', '17:00']);
});

test('free plan: nothing before 08:00 Singapore, even with a Reel posted at 06:00', () => {
  const { times } = simulateDay('2026-11-12', '06:00');
  assert.ok(times.every((t) => t >= '08:00'), times.join(','));
  assert.equal(times[0], '08:00'); // the story switch and the catch-up merge into one update
  assert.ok(times.length <= 8);
});

test('free plan: late Reel at 21:00 keeps slots before midnight only', () => {
  const { times } = simulateDay('2026-11-12', '21:00');
  assert.deepEqual(times, ['21:00', '21:15', '21:30', '22:00', '23:00']);
});

test('free plan: a missed slot is caught up once, not repeated', () => {
  const posted = sgt('2026-11-12T08:00:00');
  const pushes = [new Date(posted).toISOString(), new Date(posted + 15 * 60e3).toISOString()];
  // cron was down from 08:20 to 09:40: one catch-up push for the +1h slot, then nothing until +2h
  const a = shouldPush(base({ now: posted + 100 * 60e3, postedAt: posted, lastPushes: pushes }));
  assert.equal(a.push, true);
  assert.match(a.reason, /\+1h/);
  const b = shouldPush(base({ now: posted + 105 * 60e3, postedAt: posted, lastPushes: [...pushes, new Date(posted + 100 * 60e3).toISOString()] }));
  assert.equal(b.push, false);
});

test('free plan: new Reel pushes immediately; no Reel time means no slot', () => {
  const now = sgt('2026-11-12T08:01:00');
  assert.equal(shouldPush(base({ now, storyChanged: true })).push, true);
  assert.equal(shouldPush(base({ now, storyChanged: true })).reason, 'new Reel');
  assert.equal(shouldPush(base({ now, postedAt: null, lastPushes: [new Date(now - 60e3).toISOString()] })).push, false);
  assert.equal(shouldPush(base({ now, storyChanged: true, quotaUsedThisMonth: 245, quotaFromApi: true })).push, false);
});

test('free plan month budget: 31-day December with a Reel every day stays at or under 245', () => {
  let used = 0;
  let total = 0;
  for (let day = 1; day <= 31; day++) {
    const d = `2026-12-${String(day).padStart(2, '0')}`;
    const weekend = [0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay());
    const r = simulateDay(d, weekend ? '10:00' : '08:00', { used });
    used = r.used;
    total += r.times.length;
    assert.ok(r.times.length <= 8, `${d}: ${r.times.length}`);
    assert.ok(r.times.length >= 6, `${d}: only ${r.times.length}`); // every Reel still gets its early updates
  }
  assert.ok(total <= 245, `total ${total}`);
  assert.ok(total >= 230, `budget badly under-used: ${total}`);
});

test('free plan month budget: 30-day November gets the full 8 a day (240)', () => {
  let used = 0;
  for (let day = 1; day <= 30; day++) {
    const d = `2026-11-${String(day).padStart(2, '0')}`;
    const r = simulateDay(d, '08:00', { used });
    assert.equal(r.times.length, 8, d);
    used = r.used;
  }
  assert.equal(used, 240);
});

test('free plan month budget edges: 244 allows one, 245 stops, limit from /auth/me lowers the cap', () => {
  const posted = sgt('2026-11-30T08:00:00');
  const now = posted + 16 * 60e3;
  const prior = [new Date(posted).toISOString()];
  assert.equal(shouldPush(base({ now, postedAt: posted, lastPushes: prior, quotaUsedThisMonth: 244, quotaFromApi: true })).push, true);
  const stop = shouldPush(base({ now, postedAt: posted, lastPushes: prior, quotaUsedThisMonth: 245, quotaFromApi: true }));
  assert.equal(stop.push, false);
  assert.match(stop.reason, /monthly cap/);
  assert.equal(shouldPush(base({ now, postedAt: posted, lastPushes: prior, quotaUsedThisMonth: 245, quotaFromApi: true, force: true })).push, false); // force never breaks the cap
  assert.equal(monthCap(250), 245);
  assert.equal(monthCap(100), 95);
  assert.equal(monthCap(null), 245);
  assert.equal(shouldPush(base({ now, postedAt: posted, lastPushes: prior, quotaUsedThisMonth: 95, quotaLimit: 100, quotaFromApi: true })).push, false);
});

test('free plan: local log raises the count unless the number came from /auth/me', () => {
  const posted = sgt('2026-11-30T08:00:00');
  const now = posted + 16 * 60e3;
  const log = Array.from({ length: 245 }, (_, i) => new Date(Date.UTC(2026, 10, 1) + i * 60e3).toISOString());
  log.push(new Date(posted).toISOString());
  assert.equal(shouldPush(base({ now, postedAt: posted, lastPushes: log, quotaUsedThisMonth: 10 })).push, false);
  // last month's pushes do not count
  const oldLog = Array.from({ length: 245 }, (_, i) => new Date(Date.UTC(2026, 9, 1) + i * 60e3).toISOString());
  assert.equal(shouldPush(base({ now, postedAt: posted, lastPushes: [...oldLog, new Date(posted).toISOString()], quotaUsedThisMonth: 10 })).push, true);
});

test('free plan: daily budget shrinks near month end when behind', () => {
  // 31 Dec, 240 used before today -> 5 left for the last day
  const r = simulateDay('2026-12-31', '08:00', { used: 240 });
  assert.equal(r.times.length, 5);
  assert.deepEqual(r.times, ['08:00', '08:15', '08:30', '09:00', '10:00']);
});

test('force pushes outside the schedule and outside the window (within the cap)', () => {
  const d = shouldPush(base({ now: sgt('2026-11-12T03:00:00'), force: true }));
  assert.equal(d.push, true);
  assert.equal(d.reason, 'forced');
});

test('restart: only when the activity is ended (reported or stale) or has run about 3 days', () => {
  const posted = sgt('2026-11-12T08:00:00');
  const now = posted + 15 * 60e3;
  const recent = [new Date(posted).toISOString()];
  assert.equal(shouldPush(base({ now, postedAt: posted, lastPushes: recent })).restart, false);
  assert.equal(shouldPush(base({ now, postedAt: posted, lastPushes: recent, activityState: 'ongoing' })).restart, false);
  assert.equal(shouldPush(base({ now, postedAt: posted, lastPushes: recent, activityState: 'ended' })).restart, true);
  // the morning switch after last night's stale auto-end is a fresh start
  const morning = shouldPush(base({ now: posted, storyChanged: true, lastPushes: [new Date(posted - 17 * 3600e3).toISOString()] }));
  assert.equal(morning.push, true);
  assert.equal(morning.restart, true);
  // ongoing on the server but running ~3 days
  assert.equal(shouldPush(base({ now, postedAt: posted, lastPushes: recent, activityState: 'ongoing', lastStart: new Date(now - 72 * 3600e3).toISOString() })).restart, true);
  // no extra pushes just to restart on the free plan
  const quiet = shouldPush(base({ now: sgt('2026-11-12T20:00:00'), postedAt: posted, lastPushes: [new Date(sgt('2026-11-12T15:00:00')).toISOString()], activityState: 'ended' }));
  assert.equal(quiet.push, false);
  assert.equal(quiet.restart, false);
});

test('paid plan: pushes on every 5-minute step of the simulated day, 08:00-23:59 Singapore', () => {
  const { times } = simulateDay('2026-11-12', '08:00', { plan: 'paid' });
  assert.equal(times.length, 16 * 12);
  assert.equal(times[0], '08:00');
  assert.equal(times[times.length - 1], '23:55');
  const now = sgt('2026-11-12T12:00:00');
  assert.equal(shouldPush(base({ plan: 'paid', now, lastPushes: [new Date(now - 50e3).toISOString()] })).push, true); // 50 s (loop jitter)
  assert.equal(shouldPush(base({ plan: 'paid', now, lastPushes: [new Date(now - 30e3).toISOString()] })).push, false);
  assert.equal(shouldPush(base({ plan: 'paid', now: sgt('2026-11-12T07:55:00') })).push, false);
  assert.equal(shouldPush(base({ plan: 'paid', now, quotaUsedThisMonth: 99999, lastPushes: [new Date(now - 300e3).toISOString()] })).push, true);
});

// ------------------------------------------------------------ network (fake fetch)

type Call = { url: string; method: string; headers: Record<string, string>; body: any; signal?: AbortSignal };
function fakeFetch(responder: (c: Call, i: number) => { status: number; body?: unknown; headers?: Record<string, string> } | Promise<never>) {
  const calls: Call[] = [];
  const impl: FetchLike = async (url, init) => {
    const c: Call = { url, method: init.method, headers: init.headers, body: init.body ? JSON.parse(init.body) : undefined, signal: init.signal };
    calls.push(c);
    const r = await responder(c, calls.length - 1);
    const text = r.body === undefined ? '' : typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, text: async () => text, headers: { get: (k: string) => r.headers?.[k] ?? null } };
  };
  return { calls, impl };
}
const board = () => buildBoard({ name: 'Lyon', stats, url: URL });

test('pushBoard: GET first; creates only when missing (metered) then PATCHes ongoing with merge-patch, priority 9 and stale_ttl 6 h', async () => {
  const f = fakeFetch((c) => (c.method === 'GET' ? { status: 404, body: {} } : c.method === 'POST' ? { status: 201, body: { slug: 'fs101-results' } } : { status: 200, body: { state: 'ongoing' } }));
  const r = await pushBoard({ key: FAKE_KEY, slug: 'fs101-results', name: 'FS101 results', content: board(), fetchImpl: f.impl });
  assert.deepEqual(r, { ok: true, status: 200, quotaExceeded: false, rateLimited: false, error: null, updates: 2 });
  assert.equal(f.calls.length, 3);
  const [get, create, patch] = f.calls;
  assert.equal(get.method, 'GET');
  assert.equal(create.url, 'https://api.pushward.app/activities');
  assert.equal(create.method, 'POST');
  assert.equal(create.headers['Content-Type'], 'application/json');
  assert.equal(create.headers.Authorization, `Bearer ${FAKE_KEY}`);
  assert.equal(create.body.slug, 'fs101-results');
  assert.equal(create.body.priority, 9);
  assert.equal(create.body.stale_ttl, 6 * 3600);
  assert.ok(create.signal instanceof AbortSignal);
  assert.equal(patch.url, 'https://api.pushward.app/activities/fs101-results');
  assert.equal(patch.method, 'PATCH');
  assert.equal(patch.headers['Content-Type'], 'application/merge-patch+json');
  assert.equal(patch.body.state, 'ongoing');
  assert.equal(patch.body.priority, 9);
  assert.equal(patch.body.stale_ttl, 6 * 3600);
  assert.equal(patch.body.content.template, 'board');
  assert.equal(patch.body.content.tiles.length, 4);
  assert.ok(!('url_action' in patch.body.content));
  assert.ok(patch.signal instanceof AbortSignal);
});

test('pushBoard: 429 quota.exceeded is reported as quotaExceeded, without the key', async () => {
  const f = fakeFetch((c) =>
    c.method === 'GET'
      ? { status: 200, body: { state: 'ongoing' } }
      : c.method === 'POST'
      ? { status: 200, body: {} }
      : { status: 429, body: { code: 'quota.exceeded', detail: 'quota exceeded for live_activity_updates', kind: 'live_activity_updates', used: 250, limit: 250, reset_at: '2026-12-01T00:00:00Z', status: 429 } },
  );
  const r = await pushBoard({ key: FAKE_KEY, slug: 'fs101-results', name: 'FS101', content: board(), fetchImpl: f.impl });
  assert.equal(r.ok, false);
  assert.equal(r.status, 429);
  assert.equal(r.quotaExceeded, true);
  assert.equal(r.rateLimited, false);
  assert.equal(r.updates, 0);
  assert.match(r.error ?? '', /quota\.exceeded/);
  assert.match(r.error ?? '', /250\/250/);
  assert.ok(!(r.error ?? '').includes(FAKE_KEY));
});

test('pushBoard: 429 rate_limit.exceeded is not a quota problem and carries retry time', async () => {
  const f = fakeFetch((c) => (c.method === 'GET' ? { status: 200, body: { state: 'ongoing' } } : { status: 429, body: { code: 'rate_limit.exceeded', detail: 'rate limit exceeded', retry_after_ms: 60000 } }));
  const r = await pushBoard({ key: FAKE_KEY, slug: 'fs101-results', name: 'FS101', content: board(), fetchImpl: f.impl });
  assert.equal(r.quotaExceeded, false);
  assert.equal(r.rateLimited, true);
  assert.equal(r.retryAfterMs, 60000);
});

test('pushBoard: a 429 whose detail mentions quota but code differs is not quotaExceeded (match on code)', async () => {
  const f = fakeFetch((c) => (c.method === 'GET' ? { status: 200, body: { state: 'ongoing' } } : { status: 429, body: { code: 'other', detail: 'quota-ish' } }));
  const r = await pushBoard({ key: FAKE_KEY, slug: 'fs101-results', name: 'FS101', content: board(), fetchImpl: f.impl });
  assert.equal(r.quotaExceeded, false);
});

test('pushBoard: errors that echo the key are redacted; a failed read stops before any metered call', async () => {
  const f = fakeFetch(() => ({ status: 401, body: `invalid token ${FAKE_KEY}` }));
  const r = await pushBoard({ key: FAKE_KEY, slug: 'fs101-results', name: 'FS101', content: board(), fetchImpl: f.impl });
  assert.equal(r.ok, false);
  assert.equal(r.status, 401);
  assert.equal(f.calls.length, 1);
  assert.ok(!(r.error ?? '').includes(FAKE_KEY), r.error ?? '');
  assert.match(r.error ?? '', /read failed: HTTP 401/);
});

test('pushBoard: network errors and timeouts never leak the key', async () => {
  const thrower = fakeFetch(() => Promise.reject(new Error(`connect failed for Bearer ${FAKE_KEY}`)));
  const a = await pushBoard({ key: FAKE_KEY, slug: 'fs101-results', name: 'FS101', content: board(), fetchImpl: thrower.impl });
  assert.equal(a.ok, false);
  assert.equal(a.status, 0);
  assert.ok(!(a.error ?? '').includes(FAKE_KEY), a.error ?? '');
  // a fetch that waits for the abort signal: the timeout fires
  const hanging: FetchLike = (_url, init) =>
    new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'TimeoutError' }))));
  const b = await pushBoard({ key: FAKE_KEY, slug: 'fs101-results', name: 'FS101', content: board(), fetchImpl: hanging, timeoutMs: 30 });
  assert.equal(b.ok, false);
  assert.match(b.error ?? '', /timed out/);
});

test('pushBoard: an existing activity is never re-created (the create call is metered)', async () => {
  const f = fakeFetch((c) => (c.method === 'GET' ? { status: 200, body: { state: 'ongoing' } } : { status: 200, body: {} }));
  const r = await pushBoard({ key: FAKE_KEY, slug: 'fs101-results', name: 'FS101', content: board(), fetchImpl: f.impl });
  assert.equal(r.updates, 1);
  assert.deepEqual(f.calls.map((c) => c.method), ['GET', 'PATCH']);
});

test('pushBoard: refuses a missing or malformed key, bad slug or invalid board without calling the network', async () => {
  const f = fakeFetch(() => ({ status: 200 }));
  for (const key of [undefined, '', 'sk_live_123', 'hlk_ has space']) {
    const r = await pushBoard({ key, slug: 'fs101-results', name: 'x', content: board(), fetchImpl: f.impl });
    assert.equal(r.ok, false);
    assert.ok(!(r.error ?? '').includes('has space'));
  }
  assert.equal((await pushBoard({ key: FAKE_KEY, slug: '-bad slug', name: 'x', content: board(), fetchImpl: f.impl })).ok, false);
  const broken = { ...board(), compact_trailing_label: '12345' };
  const r = await pushBoard({ key: FAKE_KEY, slug: 'fs101-results', name: 'x', content: broken, fetchImpl: f.impl });
  assert.match(r.error ?? '', /invalid board/);
  assert.equal(f.calls.length, 0);
});

test('pushBoard restart: still ongoing after ~3 days -> end then ongoing (2 updates); already ended -> one PATCH', async () => {
  const ongoing = fakeFetch((c) => (c.method === 'GET' ? { status: 200, body: { slug: 'fs101-results', state: 'ONGOING' } } : { status: 200, body: {} }));
  const a = await pushBoard({ key: FAKE_KEY, slug: 'fs101-results', name: 'FS101', content: board(), fetchImpl: ongoing.impl, restart: true });
  assert.equal(a.ok, true);
  assert.equal(a.updates, 2);
  assert.deepEqual(
    ongoing.calls.map((c) => `${c.method} ${c.body?.state ?? ''}`.trim()),
    ['GET', 'PATCH ended', 'PATCH ongoing'],
  );
  const ended = fakeFetch((c) => (c.method === 'GET' ? { status: 200, body: { state: 'ended' } } : { status: 200, body: {} }));
  const b = await pushBoard({ key: FAKE_KEY, slug: 'fs101-results', name: 'FS101', content: board(), fetchImpl: ended.impl, restart: true });
  assert.equal(b.updates, 1);
  assert.deepEqual(
    ended.calls.map((c) => c.method),
    ['GET', 'PATCH'],
  );
});

test('getQuota reads live usage from /auth/me', async () => {
  const f = fakeFetch(() => ({
    status: 200,
    body: { id: 'u', live_activity_updates_used: 86, live_activity_updates_limit: 250, quota_resets_at: '2026-12-01T00:00:00Z', quota_period_month: 202611, integration_key: { id: 'k' } },
  }));
  const q = await getQuota({ key: FAKE_KEY, fetchImpl: f.impl });
  assert.deepEqual(q, { ok: true, status: 200, used: 86, limit: 250, resetsAt: '2026-12-01T00:00:00Z', periodMonth: 202611, error: null });
  assert.equal(f.calls[0].url, 'https://api.pushward.app/auth/me');
  assert.equal(f.calls[0].method, 'GET');
  assert.equal(f.calls[0].body, undefined);
  // uncapped (paid): limit omitted -> null
  const paid = fakeFetch(() => ({ status: 200, body: { live_activity_updates_used: 1000 } }));
  assert.equal((await getQuota({ key: FAKE_KEY, fetchImpl: paid.impl })).limit, null);
  const fail = fakeFetch(() => ({ status: 401, body: { code: 'token.invalid', detail: 'invalid token' } }));
  const e = await getQuota({ key: FAKE_KEY, fetchImpl: fail.impl });
  assert.equal(e.ok, false);
  assert.match(e.error ?? '', /token\.invalid/);
});

test('getActivity reports state, and 404 as not existing', async () => {
  const f = fakeFetch(() => ({ status: 200, body: { slug: 'fs101-results', state: 'ended' } }));
  assert.deepEqual(await getActivity({ key: FAKE_KEY, slug: 'fs101-results', fetchImpl: f.impl }), { ok: true, status: 200, exists: true, state: 'ended', error: null });
  assert.equal(f.calls[0].url, 'https://api.pushward.app/activities/fs101-results');
  const nf = fakeFetch(() => ({ status: 404, body: { code: 'activity.not_found' } }));
  assert.deepEqual(await getActivity({ key: FAKE_KEY, slug: 'fs101-results', fetchImpl: nf.impl }), { ok: true, status: 404, exists: false, state: null, error: null });
});

test('shouldPush + quota from /auth/me end to end with a fake server', async () => {
  const f = fakeFetch(() => ({ status: 200, body: { live_activity_updates_used: 245, live_activity_updates_limit: 250 } }));
  const q = await getQuota({ key: FAKE_KEY, fetchImpl: f.impl });
  const d = shouldPush(base({ now: sgt('2026-11-20T08:00:00'), storyChanged: true, quotaUsedThisMonth: q.used ?? 0, quotaLimit: q.limit, quotaFromApi: q.ok }));
  assert.equal(d.push, false);
});
