// Offline tests for scripts/lib/trend-sources.ts, run against saved fixtures in __fixtures__/trend/.
// Run: npx tsx --test scripts/lib/trend-sources.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clean, footballTitlesFromMeta, isJunkTitle, parseNewsRss, parseOnThisDay, parseTraffic, parseTrends, parseWikiTop,
  TREND_UA, type Signal,
} from './trend-sources';

const dir = join(dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'trend');
const fx = (n: string) => readFileSync(join(dir, n), 'utf8');
const TODAY = '2026-11-17';

function checkShape(s: Signal) {
  assert.ok(s.title.length > 0, 'title');
  assert.ok(Number.isFinite(s.weight) && s.weight >= 0, 'weight');
  assert.match(s.date, /^\d{4}-\d{2}-\d{2}$/);
  if (s.summary) assert.ok(s.summary.length <= 300);
}

test('user agent is descriptive and carries no email', () => {
  assert.match(TREND_UA, /FootballStories101-trend-scout/);
  assert.doesNotMatch(TREND_UA, /@/);
});

test('parseTraffic handles plain, comma and K/M forms', () => {
  assert.equal(parseTraffic('20000+'), 20000);
  assert.equal(parseTraffic('1,000+'), 1000);
  assert.equal(parseTraffic('500K+'), 500000);
  assert.equal(parseTraffic('2M+'), 2_000_000);
  assert.equal(parseTraffic(undefined), 0);
});

test('clean strips tags, entities and trims to 300 chars', () => {
  assert.equal(clean('<![CDATA[<p>Tom &amp; Jerry</p>]]>'), 'Tom & Jerry');
  assert.ok(clean('x'.repeat(500)).length <= 300);
});

test('wikipedia top: drops Main_Page, Special: and Portal pages, keeps views and region', () => {
  const sigs = parseWikiTop(JSON.parse(fx('wiki-top-en.json')), 'en', '2026-11-16');
  assert.ok(sigs.length > 20);
  assert.ok(!sigs.some((s) => /^(Main Page|Special:|Portal:|Wikipedia:)/.test(s.title)));
  assert.ok(isJunkTitle('Main_Page') && isJunkTitle('Special:Search'));
  assert.ok(sigs.every((s) => s.source === 'wikipedia' && s.region === 'en' && s.weight > 0));
  sigs.forEach(checkShape);
  assert.ok(parseWikiTop(JSON.parse(fx('wiki-top-es.json')), 'es', '2026-11-16').length > 20);
});

test('football filter keeps footballers/clubs/teams and drops American football and strays', () => {
  const kept = footballTitlesFromMeta(JSON.parse(fx('wiki-meta-en.json')).query.pages);
  assert.deepEqual([...kept].sort(), ['Arsenal F.C.', 'Palestine national football team', 'Ronaldinho']);
});

for (const [file, source] of [['bbc.xml', 'bbc'], ['guardian.xml', 'guardian'], ['espn.xml', 'espn']] as const) {
  test(`${source} RSS parses headlines`, () => {
    const sigs = parseNewsRss(fx(file), source, TODAY);
    assert.ok(sigs.length >= 3, `${source} items`);
    assert.ok(sigs.every((s) => s.source === source && s.weight === 1 && /^https?:/.test(s.url ?? '')));
    assert.ok(sigs.every((s) => !/[<>]|&amp;|CDATA/.test(s.title)));
    sigs.forEach(checkShape);
  });
}

test('google trends RSS keeps every item with traffic, region and first news headline', () => {
  const sigs = parseTrends(fx('trends-gb.xml'), 'GB', TODAY);
  assert.ok(sigs.length >= 3);
  assert.ok(sigs.every((s) => s.source === 'google-trends' && s.region === 'GB'));
  assert.ok(sigs.some((s) => s.weight > 0));
  assert.ok(sigs.some((s) => s.summary && s.summary.length > 10));
  assert.equal(sigs[0].title, 'singapore vs brazil');
  assert.equal(sigs[0].weight, 2000);
  sigs.forEach(checkShape);
});

test('on this day keeps only association football events', () => {
  const sigs = parseOnThisDay(JSON.parse(fx('onthisday.json')), TODAY);
  assert.equal(sigs.length, 0); // fixture holds an American football event and unrelated ones only
  const synthetic = parseOnThisDay(
    { events: [{ text: 'Brazil win the FIFA World Cup final.', year: 1970, pages: [{ title: 'Brazil', content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Brazil' } } }] }, { text: 'A rocket launches.', year: 2000, pages: [] }] },
    TODAY,
  );
  assert.equal(synthetic.length, 1);
  assert.equal(synthetic[0].source, 'onthisday');
  assert.match(synthetic[0].title, /^1970:/);
});
