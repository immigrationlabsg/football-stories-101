import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWidget, shouldUpdateWidget, pushWidget, validateWidget, WIDGET_SLUG, WIDGET_MONTHLY_CAP, type WidgetPayload } from './pushward-widget';

const FAKE_KEY = 'hlk_TESTONLY_not_a_real_key_123';
const live = {
  read_at: '2026-11-11T13:00:00Z',
  today_story: 24,
  today_title: 'Lyon',
  networks: {
    instagram: { followers: 100, posts: [{ story: 24, views: 12345, likes: 1, shares: 1, comments: 0 }, { story: 23, views: 999, likes: 0, shares: 0, comments: 0 }] },
    tiktok: { followers: 50, posts: [{ story: 24, views: 2000, likes: 0, shares: 0, comments: 0 }] },
    youtube: { followers: 5, posts: [{ story: 23, views: 70, likes: 0, shares: 0, comments: 0 }] }, // not posted today yet
    threads: { followers: 9, posts: [{ story: 24, views: null, likes: 0, shares: 0, comments: 0 }] },
  },
};

test('buildWidget: stat_list with total first and per-platform views of today\'s story', () => {
  const p = buildWidget(live as any, { dashboardUrl: 'https://example.github.io/live/' });
  assert.equal(p.content.template, 'stat_list');
  assert.equal(p.content.label, 'Lyon');
  assert.equal(p.content.subtitle, 'Story 24 · views as of 21:00 SGT');
  assert.deepEqual(p.content.stat_rows, [
    { label: 'Total', value: '14,345', unit: 'views' },
    { label: 'Instagram', value: '12,345' },
    { label: 'TikTok', value: '2,000' },
    { label: 'YouTube', value: '–' },
    { label: 'Threads', value: '–' },
  ]);
  assert.deepEqual(p.content.tap_action, { url: 'https://example.github.io/live/', foreground: true });
  assert.equal(p.stale_after, undefined);
  assert.deepEqual(validateWidget(p, WIDGET_SLUG), []);
});

test('buildWidget: no story yet, empty data, long title clipped', () => {
  const p = buildWidget({} as any);
  assert.equal(p.content.label, 'No Reel yet today');
  assert.ok(p.content.stat_rows.every((r) => r.value === '–'));
  const long = buildWidget({ ...live, today_title: 'x'.repeat(400) } as any);
  assert.equal(long.content.label!.length, 256);
  assert.deepEqual(validateWidget(long), []);
});

test('buildWidget: stale_after in range kept, out of range rejected', () => {
  assert.equal(buildWidget(live as any, { staleAfter: 129600 }).stale_after, 129600);
  assert.throws(() => buildWidget(live as any, { staleAfter: 10 }), /stale_after/);
});

test('validateWidget catches limit breaks', () => {
  const bad: WidgetPayload = { name: '', content: { template: 'stat_list', stat_rows: [] } };
  const e = validateWidget(bad, '-bad slug');
  assert.ok(e.some((x) => x.includes('slug')));
  assert.ok(e.some((x) => x.includes('name')));
  assert.ok(e.some((x) => x.includes('1 to 6')));
  const rows = Array.from({ length: 7 }, () => ({ label: 'a', value: '1' }));
  assert.ok(validateWidget({ name: 'n', content: { template: 'stat_list', stat_rows: rows } }).length > 0);
  assert.ok(validateWidget({ name: 'n', content: { template: 'stat_list', stat_rows: [{ label: 'a'.repeat(33), value: '1' }] } }).length > 0);
  assert.ok(validateWidget({ name: 'n', content: { template: 'stat_list', stat_rows: [{ label: 'a', value: '1', unit: 'u'.repeat(17) }] } }).length > 0);
});

// ---- budget ----
const at = (iso: string) => new Date(iso);
test('shouldUpdateWidget: Reel switch always goes, under the cap', () => {
  assert.equal(shouldUpdateWidget({ now: at('2026-11-20T00:05:00Z'), storyChanged: true, updatesThisMonth: 40, lastUpdate: '2026-11-19T13:00:00Z' }).update, true);
  const capped = shouldUpdateWidget({ now: at('2026-11-20T00:05:00Z'), storyChanged: true, updatesThisMonth: 48, lastUpdate: '2026-11-19T13:00:00Z' });
  assert.equal(capped.update, false);
  assert.match(capped.reason, /cap/);
});

test('shouldUpdateWidget: count resets in a new UTC month', () => {
  const r = shouldUpdateWidget({ now: at('2026-12-01T00:05:00Z'), storyChanged: true, updatesThisMonth: 48, lastUpdate: '2026-11-30T13:00:00Z' });
  assert.equal(r.used, 0);
  assert.equal(r.update, true);
});

test('shouldUpdateWidget: evening refresh only, with gap and pace', () => {
  // 12:00 SGT = 04:00Z: before 21:00 SGT
  assert.equal(shouldUpdateWidget({ now: at('2026-11-11T04:00:00Z'), storyChanged: false, updatesThisMonth: 5, lastUpdate: '2026-11-11T00:05:00Z' }).update, false);
  // 21:30 SGT, last push 08:05 SGT, 11 Nov, used 12 < pace ceil(48*11/30)=18, slots for 19 days left: 12+1+19=32 <= 48
  assert.equal(shouldUpdateWidget({ now: at('2026-11-11T13:30:00Z'), storyChanged: false, updatesThisMonth: 12, lastUpdate: '2026-11-11T00:05:00Z' }).update, true);
  // pushed 2 h ago: too soon
  assert.equal(shouldUpdateWidget({ now: at('2026-11-11T13:30:00Z'), storyChanged: false, updatesThisMonth: 12, lastUpdate: '2026-11-11T11:30:00Z' }).update, false);
  // ahead of pace
  assert.match(shouldUpdateWidget({ now: at('2026-11-11T13:30:00Z'), storyChanged: false, updatesThisMonth: 18, lastUpdate: '2026-11-11T00:05:00Z' }).reason, /pace/);
  // late in month: must keep a slot for each remaining switch (28 Nov, 2 days left, used 46 -> 46+1+2 > 48)
  assert.match(shouldUpdateWidget({ now: at('2026-11-28T13:30:00Z'), storyChanged: false, updatesThisMonth: 46, lastUpdate: '2026-11-28T00:05:00Z' }).reason, /switch/);
});

test('shouldUpdateWidget: simulated month never exceeds the cap and every switch lands', () => {
  for (const [y, m] of [[2026, 10], [2027, 0], [2027, 1]] as const) {
    const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    let used = 0, last: Date | null = null, switches = 0;
    for (let d = 1; d <= days; d++) {
      for (let h = 0; h < 24; h++) {
        for (const min of [0, 5, 30]) {
          const now = new Date(Date.UTC(y, m, d, h, min));
          const storyChanged = h === 0 && min === 5; // 08:05 SGT Reel switch each day
          const r = shouldUpdateWidget({ now, storyChanged, updatesThisMonth: used, lastUpdate: last });
          if (r.update) { used = r.used + 1; last = now; if (storyChanged) switches++; }
        }
      }
    }
    assert.ok(used <= WIDGET_MONTHLY_CAP, `used ${used}`);
    assert.equal(switches, days, 'every daily switch pushed');
  }
});

// ---- network ----
function fakeFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const calls: { url: string; init: any }[] = [];
  const f = (async (url: string, init: any) => {
    calls.push({ url, init });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
  }) as unknown as typeof fetch;
  return { f, calls };
}
const payload = buildWidget(live as any);

test('pushWidget: POST /widgets with bearer key, slug and payload', async () => {
  const { f, calls } = fakeFetch(201, { slug: WIDGET_SLUG }, { 'X-Resource-Action': 'created' });
  const r = await pushWidget({ key: FAKE_KEY, payload, fetchImpl: f });
  assert.deepEqual(r, { ok: true, status: 201, quotaExceeded: false, action: 'created' });
  assert.equal(calls[0].url, 'https://api.pushward.app/widgets');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${FAKE_KEY}`);
  const sent = JSON.parse(calls[0].init.body);
  assert.equal(sent.slug, WIDGET_SLUG);
  assert.equal(sent.content.template, 'stat_list');
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test('pushWidget: quota exceeded is flagged and the key never leaks', async () => {
  const { f } = fakeFetch(429, { status: 429, code: 'quota.exceeded', kind: 'widget_updates', detail: `bad ${FAKE_KEY}`, reset_at: '2026-12-01T00:00:00Z' });
  const r = await pushWidget({ key: FAKE_KEY, payload, fetchImpl: f });
  assert.equal(r.ok, false);
  assert.equal(r.quotaExceeded, true);
  assert.equal(r.resetAt, '2026-12-01T00:00:00Z');
  assert.ok(!JSON.stringify(r).includes(FAKE_KEY));
});

test('pushWidget: rate limit 429 is not a quota hit; 422 reports code', async () => {
  const r1 = await pushWidget({ key: FAKE_KEY, payload, fetchImpl: fakeFetch(429, { code: 'rate_limit.exceeded' }).f });
  assert.equal(r1.quotaExceeded, false);
  const r2 = await pushWidget({ key: FAKE_KEY, payload, fetchImpl: fakeFetch(422, { code: 'validation', detail: 'stat_rows' }).f });
  assert.equal(r2.status, 422);
  assert.match(r2.error!, /422 validation: stat_rows/);
});

test('pushWidget: missing or malformed key -> no request', async () => {
  const { f, calls } = fakeFetch(201, {});
  const r = await pushWidget({ key: undefined, payload, fetchImpl: f });
  assert.equal(r.ok, false);
  assert.equal(calls.length, 0);
  assert.equal((await pushWidget({ key: 'sk_wrong', payload, fetchImpl: f })).ok, false);
});

test('pushWidget: timeout and network errors are caught without the key', async () => {
  const hang = ((_u: string, init: any) => new Promise((_res, rej) => init.signal.addEventListener('abort', () => rej(init.signal.reason)))) as unknown as typeof fetch;
  const r = await pushWidget({ key: FAKE_KEY, payload, fetchImpl: hang, timeoutMs: 30 });
  assert.equal(r.ok, false);
  assert.match(r.error!, /timed out/);
  const boom = (async () => { throw new Error(`ECONNRESET ${FAKE_KEY}`); }) as unknown as typeof fetch;
  const r2 = await pushWidget({ key: FAKE_KEY, payload, fetchImpl: boom });
  assert.ok(!r2.error!.includes(FAKE_KEY));
});
