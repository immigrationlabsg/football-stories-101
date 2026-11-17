/** Offline check of the trend scout's scoring (npm run trend-scout:test). Exits 1 on any failure. */
import { scoreTrends, fold, type BankStory, type Anniversary } from './trend-scout';
import type { Signal } from './lib/trend-sources';

let failed = 0;
const ok = (cond: boolean, msg: string) => { console.log(`${cond ? 'ok  ' : 'FAIL'} ${msg}`); if (!cond) failed++; };

const day = new Date('2026-11-17T00:00:00Z');
const bank: BankStory[] = [
  { number: 28, slug: 'messi', title: "Messi's 47 seconds", date: '2026-11-16', posted: true, draft: false, people: ['Lionel Messi'], clubs: [], countries: ['Argentina'] },
  { number: 40, slug: 'dalglish', title: 'King Kenny', date: '2026-11-28', posted: false, draft: false, people: ['Kenny Dalglish', 'Andy Robertson'], clubs: ['Liverpool'], countries: ['Scotland'] },
  { number: 41, slug: 'quiet', title: 'Nobody trending', date: '2026-11-29', posted: false, draft: false, people: ['Obscure Person'], clubs: [], countries: ['Peru'] },
];
const anniversaries: Anniversary[] = [
  { date: '11-18', year: 2009, title: "Thierry Henry's handball", people: ['Thierry Henry'], clubs: [], countries: ['France', 'Republic of Ireland'], angle: 'x' },
  { date: '11-17', year: 1993, title: 'San Marino score after 8.3 seconds v England', people: ['Davide Gualtieri'], clubs: [], countries: ['San Marino', 'England'] },
  { date: '12-25', year: 1990, title: 'Too far away', people: ['Nobody'], clubs: [], countries: [] },
];
const signals: Signal[] = [
  { source: 'wikipedia', title: 'Andy_Robertson', weight: 90000, region: 'en', date: '2026-11-16' },
  { source: 'bbc', title: 'Robertson passes Dalglish as Scotland lose 4-0', weight: 1, date: '2026-11-17' },
  { source: 'guardian', title: 'Robertson earns 103rd cap in Swiss defeat', weight: 1, date: '2026-11-17' },
  { source: 'wikipedia', title: 'Thomas_Frank', weight: 19000, region: 'en', date: '2026-11-16' },
  { source: 'bbc', title: 'Thomas Frank confirmed at Crystal Palace', weight: 1, date: '2026-11-17' },
  { source: 'google-trends', title: 'taylor swift', weight: 500000, region: 'GB', date: '2026-11-17' },
  { source: 'google-trends', title: 'singapore vs brazil', weight: 20000, region: 'SG', date: '2026-11-17' },
];

const { hooks, heat } = scoreTrends({ signals, bank, anniversaries, day });
const names = heat.map((h) => h.name);

ok(fold('Pékerman_José') === 'pekerman jose', 'fold strips accents and underscores');
ok(names.includes('Andy Robertson'), 'Robertson is hot (Wikipedia + 2 headlines)');
ok(!names.includes('Taylor Swift') && !heat.some((h) => /swift/i.test(h.name)), 'non-football Google trend ignored');
const bank40 = hooks.find((h) => h.type === 'bank' && h.story?.number === 40);
ok(!!bank40, 'unposted story 040 with a trending person becomes a bank hook');
ok(!hooks.some((h) => h.type === 'bank' && h.story?.number === 41), 'story with no trending names is not pitched');
ok(!hooks.some((h) => h.type === 'bank' && h.story?.number === 28), 'posted stories are never bank hooks');
const san = hooks.find((h) => h.type === 'anniversary' && /San Marino/.test(h.headline));
ok(!!san && san.anniversary!.inDays === 0 && san.anniversary!.yearsAgo === 33, 'today\'s anniversary found, 33 years');
ok(hooks.some((h) => h.type === 'anniversary' && h.anniversary!.inDays === 1), 'tomorrow\'s anniversary found');
ok(!hooks.some((h) => /Too far away/.test(h.headline)), 'anniversary over 14 days away skipped');
ok(hooks.some((h) => h.type === 'new' && h.names[0] === 'Thomas Frank'), 'trending person with no story becomes a new pitch');
ok(!hooks.some((h) => h.type === 'new' && h.names[0] === 'Andy Robertson'), 'person already in an unposted story is not a new pitch');
ok(hooks.every((h, i) => i === 0 || hooks[i - 1].score >= h.score), 'hooks sorted by score');

// False matches the verifier found (17 Nov 2026).
{
  const b2: BankStory[] = [
    { number: 60, slug: 'a', title: 'A', date: '2026-12-20', posted: false, draft: false, people: ['James Trafford', 'Jim Craig', 'Ronaldo', 'Cristiano Ronaldo', 'Ole Gunnar Solskjær'], clubs: [], countries: [] },
  ];
  const sig: Signal[] = [
    { source: 'bbc', title: 'Man Utd draw at Old Trafford', weight: 1, date: '2026-11-17' },
    { source: 'bbc', title: 'Craig Levein back in management', weight: 1, date: '2026-11-17' },
    { source: 'bbc', title: "Portugal boss responds to Ronaldo's mum", weight: 1, date: '2026-11-17' },
    { source: 'bbc', title: "Portugal boss responds to Ronaldo's mum", weight: 1, date: '2026-11-17' },
    { source: 'guardian', title: 'Solskjær returns to Molde', weight: 1, date: '2026-11-17' },
    { source: 'wikipedia', title: 'Pedro_(footballer,_born_1987)', weight: 50000, region: 'en', date: '2026-11-16' },
    { source: 'bbc', title: 'Has Trafford replaced Pickford as England No 1?', weight: 1, date: '2026-11-17' },
  ];
  const r = scoreTrends({ signals: sig, bank: b2, anniversaries: [], day });
  const hv = (n: string) => r.heat.find((h) => h.name === n)?.heat ?? 0;
  ok(hv('James Trafford') === 1, '"Old Trafford" does not count for James Trafford; "Has Trafford replaced" does');
  ok(hv('Jim Craig') === 0, '"Craig Levein" does not count for Jim Craig');
  ok(hv('Ronaldo') === 0, 'one-word "Ronaldo" never matches headlines (ambiguous with Cristiano)');
  ok(hv('Ole Gunnar Solskjær') === 1, 'accented surname matches');
  ok(r.heat.some((h) => h.name.startsWith('Pedro')), 'Wikipedia title with "(footballer, born 1987)" is indexed and matched');
}

console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
