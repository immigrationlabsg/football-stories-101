/**
 * Trend scout (workflow "Trend scout"). Read only on every network: it posts nothing and changes no story.
 *
 * Why (owner, 17 Nov 2026): our stories stick to one topic and post every day, but they don't ride what football fans
 * care about right now. Each morning this reads free trend signals (scripts/lib/trend-sources.ts: Wikipedia's most-read
 * football pages, BBC/Guardian/ESPN football headlines, Google Trends, Wikipedia "On this day"), finds which people,
 * clubs and countries are hot, and ranks three kinds of hook:
 *   - bank:        a story we already have (data/story-bank.json) whose people are trending, so it could move up;
 *   - anniversary: a dated moment coming up within 14 days (data/football-anniversaries.json), boosted if trending;
 *   - new:         a trending football name we have no unposted story for, to pitch a fresh lesser-known angle.
 * The owner still approves every pitch, hook and script before anything is voiced or built.
 *
 *   npm run trend-scout              (writes trend-out/trend-hooks.json and trend-out/trend-hooks.md)
 *   OUT=dir DAY=2026-11-17 npm run trend-scout
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadStories } from './lib/stories';
import { fetchAllSignals, type Signal } from './lib/trend-sources';

export type BankStory = {
  number: number; slug: string; title: string; date: string; posted: boolean; draft: boolean;
  people: string[]; clubs: string[]; countries: string[]; events?: string[]; keywords?: string[];
};
export type Anniversary = {
  date: string; year: number; title: string; people: string[]; clubs: string[]; countries: string[];
  angle?: string; round?: boolean; sources?: string[];
};
export type Kind = 'person' | 'club' | 'country';
export type Hook = {
  type: 'bank' | 'anniversary' | 'new';
  score: number;
  headline: string;            // one line for the owner
  names: string[];             // the trending names behind it
  why: string[];               // the signals, e.g. "Wikipedia en: 66,000 reads", "BBC: <headline>"
  story?: { number: number; title: string; date: string };
  anniversary?: Anniversary & { yearsAgo: number; inDays: number };
  coveredIn?: number[];        // posted stories that already feature the name
};

// Big clubs and countries are in the headlines every day, so they only nudge a hook; trending people drive it.
const KIND_WEIGHT: Record<Kind, number> = { person: 1, club: 0.25, country: 0.1 };
const SIDE_CAP = 1.5; // most clubs and countries can add to one hook
const FOOTBALL = /\b(football|soccer|fc|f\.c\.|united|city|cup|league|uefa|fifa|premier|champions|world cup|vs?\.?|goal|striker|manager|coach|transfer|qualif|nations league|euro|copa|serie a|la liga|bundesliga|ligue 1)\b/i;

export const fold = (s: string) => foldCase(s).toLowerCase();
const foldCase = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Word edges that also work next to accented letters (plain \b treats "ø" or "é" as a break).
const B = '(?<![\\p{L}\\p{N}])';
const E = '(?![\\p{L}\\p{N}])';
/** The matchable form of a name: no accents, lower case, no "(footballer, born 1987)", no "F.C.", no "national team". */
const core = (n: string) => fold(n).replace(/\s*\(.*\)$/, '').replace(/ f\.?c\.?$/, '').replace(/^f\.?c\.? /, '').replace(/ national (football |under-\d+ )?team$/, '').trim();

type Entity = { name: string; kind: Kind; core: string; full: RegExp; surname?: RegExp; ambiguous: boolean };
// Surnames that are also ordinary words or common first names; these people match on their full name only.
const COMMON_SURNAMES = new Set(['jesus', 'silva', 'santos', 'junior', 'costa', 'jones', 'smith', 'james', 'charles', 'martin', 'thomas', 'frank', 'lewis', 'white', 'young', 'green', 'brown', 'walker', 'rodri', 'pedro', 'neville', 'moore', 'hall', 'carrick', 'craig', 'miguel', 'scott', 'paul', 'george', 'henry', 'johnson', 'kennedy']);

/** Every name we can match: from the story bank, the anniversaries, and today's football Wikipedia pages. */
export function buildIndex(bank: BankStory[], anniversaries: Anniversary[], wikiTitles: string[]): Entity[] {
  const map = new Map<string, Kind>();
  const seen = new Set<string>();
  const add = (n: string, k: Kind) => { const key = n.trim(); const c = core(key); if (!c || seen.has(c)) return; seen.add(c); map.set(key, k); };
  for (const s of bank) { s.people.forEach((p) => add(p, 'person')); s.clubs.forEach((c) => add(c, 'club')); s.countries.forEach((c) => add(c, 'country')); }
  for (const a of anniversaries) { a.people.forEach((p) => add(p, 'person')); a.clubs.forEach((c) => add(c, 'club')); a.countries.forEach((c) => add(c, 'country')); }
  for (const t of wikiTitles) {
    const n = t.replace(/_/g, ' ');
    // Seasons and competitions ("2026-27 UEFA Nations League", "Liga de Naciones") are not people, clubs or countries.
    if (/\d|\b(league|liga|cup|copa|coupe|qualifying|qualification|championship|season|temporada|tournament|euro|world|campeonato|premier|serie|bundesliga|draft)\b/i.test(n.replace(/\s*\(.*\)$/, ''))) continue;
    add(n, /national (football |under-\d+ )?team|selecci[oó]n|sele[cç][aã]o/i.test(n) ? 'country' : /(^| )F\.?C\.?( |$)|\bclub\b/i.test(n) ? 'club' : 'person');
  }
  // Surnames match too when they are distinctive (5+ letters) and belong to only one person in the index.
  const people = [...map].filter(([, k]) => k === 'person').map(([n]) => core(n));
  const surnames = new Map<string, number>();
  for (const c of people) { const last = c.split(' ').pop()!; surnames.set(last, (surnames.get(last) ?? 0) + 1); }
  const out: Entity[] = [];
  for (const [name, kind] of map) {
    const c = core(name);
    const parts = c.split(' ');
    const last = parts[parts.length - 1];
    let surname: RegExp | undefined;
    if (kind === 'person' && parts.length > 1 && last.length >= 5 && surnames.get(last) === 1 && !COMMON_SURNAMES.has(last)) {
      // Case-sensitive on purpose: the surname must be capitalised, not be "Old Trafford", and not be a first name
      // followed by another capitalised name ("Craig Levein").
      const cap = last[0].toUpperCase() + last.slice(1);
      surname = new RegExp(`${B}(?<!Old )${esc(cap)}${E}(?! \\p{Lu})`, 'u');
    }
    // A one-word name that ends a longer name ("Ronaldo" / "Cristiano Ronaldo") is too ambiguous for headlines.
    const ambiguous = kind === 'person' && parts.length === 1 && people.some((o) => o !== c && o.endsWith(` ${c}`));
    out.push({ name, kind, core: c, full: new RegExp(`${B}${esc(c)}${E}`, 'iu'), surname, ambiguous });
  }
  return out;
}

/** Does this entity appear in a signal? Wikipedia counts only for the page itself; a headline for every name in it. */
export function matches(e: Entity, s: Signal): boolean {
  if (s.source === 'wikipedia') return core(s.title) === e.core;
  const lower = fold(`${s.title} ${s.summary ?? ''}`);
  if (e.ambiguous) return false;
  if (e.full.test(lower)) return true;
  return !!e.surname && e.surname.test(foldCase(`${s.title} ${s.summary ?? ''}`));
}

/** How hot one signal is, before the kind weight. */
export function signalHeat(s: Signal): number {
  switch (s.source) {
    case 'wikipedia': return Math.max(0, Math.min(3, Math.log10(Math.max(1, s.weight)) - 3)); // 10k reads = 1, 1M = 3
    case 'google-trends': return 1.5 + Math.min(1.5, Math.log10(Math.max(1, s.weight)) / 4);
    case 'onthisday': return 1;
    default: return 1; // one news headline
  }
}

function describe(s: Signal): string {
  if (s.source === 'wikipedia') return `Wikipedia ${s.region ?? 'en'}: ${Math.round(s.weight).toLocaleString('en-GB')} reads of "${s.title.replace(/_/g, ' ')}"`;
  if (s.source === 'google-trends') return `Google Trends ${s.region ?? ''}: "${s.title}" (${Math.round(s.weight).toLocaleString('en-GB')}+ searches)${s.summary ? ` - ${s.summary}` : ''}`;
  if (s.source === 'onthisday') return `On this day: ${s.title}`;
  return `${s.source.toUpperCase()}: ${s.title}`;
}

export function scoreTrends(input: { signals: Signal[]; bank: BankStory[]; anniversaries: Anniversary[]; day: Date }): { hooks: Hook[]; heat: { name: string; kind: Kind; heat: number; why: string[] }[] } {
  const { signals, bank, anniversaries, day } = input;
  const wikiTitles = signals.filter((s) => s.source === 'wikipedia').map((s) => s.title);
  const index = buildIndex(bank, anniversaries, wikiTitles);

  // Heat per name. A news outlet counts at most 3 headlines per name, so one busy story doesn't swamp everything.
  const heat = new Map<string, { kind: Kind; heat: number; why: string[]; perSource: Record<string, number> }>();
  const seenSignal = new Set<string>();
  for (const s of signals) {
    const key = `${s.source}|${s.region ?? ''}|${fold(s.title)}`;
    if (seenSignal.has(key)) continue; // the same headline listed twice in one feed
    seenSignal.add(key);
    const text = fold(`${s.title} ${s.summary ?? ''}`);
    if (s.source === 'google-trends' && !FOOTBALL.test(text) && !index.some((e) => e.kind !== 'country' && matches(e, s))) continue;
    const h = signalHeat(s);
    if (!h) continue;
    for (const e of index) {
      if (!matches(e, s)) continue;
      const cur = heat.get(e.name) ?? { kind: e.kind, heat: 0, why: [], perSource: {} };
      const n = (cur.perSource[s.source] = (cur.perSource[s.source] ?? 0) + 1);
      if (s.source !== 'wikipedia' && n > 3) continue;
      cur.heat += h;
      if (cur.why.length < 4) cur.why.push(describe(s));
      heat.set(e.name, cur);
    }
  }
  const hot = (n: string) => heat.get(n);
  const weighted = (n: string, k: Kind) => (hot(n)?.heat ?? 0) * KIND_WEIGHT[k];
  const namesOf = (x: { people: string[]; clubs: string[]; countries: string[] }) =>
    [...x.people.map((n) => [n, 'person'] as const), ...x.clubs.map((n) => [n, 'club'] as const), ...x.countries.map((n) => [n, 'country'] as const)];

  const hooks: Hook[] = [];
  const today = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());

  // 1. Stories we already have and haven't posted.
  const iso = new Date(today).toISOString().slice(0, 10);
  const isPosted = (b: BankStory) => b.posted || b.date <= iso; // today's story is already out or going out
  for (const s of bank.filter((b) => !isPosted(b))) {
    // A story's lead people come first in its list; side characters count for less (half for the 2nd, a third...).
    const people = s.people.map((n, i) => ({ n, w: weighted(n, 'person') / (i + 1) })).filter((p) => p.w > 0).sort((a, b) => b.w - a.w);
    if (!people.length) continue; // only clubs or countries in the news: not a reason to move a story
    const side = namesOf(s).filter(([n, k]) => k !== 'person' && hot(n)).map(([n, k]) => ({ n, w: weighted(n, k) })).sort((a, b) => b.w - a.w);
    const parts = [...people, ...side];
    const score = people.reduce((t, p) => t + p.w, 0) + Math.min(SIDE_CAP, side.reduce((t, p) => t + p.w, 0));
    if (score < 1) continue;
    hooks.push({
      type: 'bank', score, story: { number: s.number, title: s.title, date: s.date },
      names: parts.map((p) => p.n),
      headline: `Story ${String(s.number).padStart(3, '0')} "${s.title}" (due ${s.date}) features ${people.map((p) => p.n).join(', ')}, trending now: move it up or open with today's news.`,
      why: people.flatMap((p) => hot(p.n)!.why).slice(0, 4),
    });
  }

  // 2. Anniversaries in the next 14 days: the nearer and rounder, the better; trending names add to it.
  for (const a of anniversaries) {
    const [mm, dd] = a.date.split('-').map(Number);
    let when = Date.UTC(day.getUTCFullYear(), mm - 1, dd);
    if (when < today) when = Date.UTC(day.getUTCFullYear() + 1, mm - 1, dd);
    const inDays = Math.round((when - today) / 86400e3);
    if (inDays > 14) continue;
    const yearsAgo = new Date(when).getUTCFullYear() - a.year;
    const round = a.round ?? [10, 15, 20, 25, 30, 40, 50, 60, 75, 100].includes(yearsAgo);
    const near = inDays === 0 ? 3 : inDays <= 3 ? 2 : inDays <= 7 ? 1.2 : 0.6;
    const parts = namesOf(a).map(([n, k], i) => ({ n, k, w: weighted(n, k) / (k === 'person' ? i + 1 : 1) })).filter((p) => p.w > 0);
    // Today's buzz fades within days, so it counts in full only for anniversaries in the next 3 days.
    const fade = inDays <= 3 ? 1 : inDays <= 7 ? 0.6 : 0.35;
    const score = near + (round ? 1.5 : 0) + fade * (parts.filter((p) => p.k === 'person').reduce((t, p) => t + p.w, 0)
      + Math.min(SIDE_CAP, parts.filter((p) => p.k !== 'person').reduce((t, p) => t + p.w, 0))) + (a.angle ? 0.3 : 0);
    const covered = bank.filter((b) => isPosted(b) && a.people.some((p) => b.people.includes(p))).map((b) => b.number);
    hooks.push({
      type: 'anniversary', score, anniversary: { ...a, yearsAgo, inDays, round }, names: parts.map((p) => p.n),
      headline: `${inDays === 0 ? 'Today' : `In ${inDays} day${inDays > 1 ? 's' : ''}`} (${a.date}): ${yearsAgo} years since ${a.title}${round ? ' (round anniversary)' : ''}.${a.angle ? ` Angle: ${a.angle}` : ''}`,
      why: parts.filter((p) => p.k === 'person').flatMap((p) => hot(p.n)!.why).slice(0, 3),
      ...(covered.length ? { coveredIn: covered } : {}),
    });
  }

  // 3. Hot football people with no unposted story: pitch a new lesser-known angle.
  const inUnposted = new Set(bank.filter((b) => !isPosted(b)).flatMap((b) => b.people));
  for (const [name, h] of heat) {
    if (h.kind !== 'person' || inUnposted.has(name)) continue;
    // Wikipedia's football filter lets a few non-football names through (NFL players, actors), so a new pitch needs a
    // football headline, or reads in at least two Wikipedia languages.
    const p = h.perSource;
    if (!(p.bbc || p.guardian || p.espn) && (p.wikipedia ?? 0) < 2) continue;
    const score = h.heat * 0.9; // a fresh story costs more work than moving one up
    if (score < 1) continue;
    const covered = bank.filter((b) => isPosted(b) && b.people.includes(name)).map((b) => b.number);
    hooks.push({
      type: 'new', score, names: [name], why: h.why,
      headline: `${name} is trending: pitch a lesser-known story about them, opened with today's news.`,
      ...(covered.length ? { coveredIn: covered } : {}),
    });
  }

  hooks.sort((a, b) => b.score - a.score);
  const heatList = [...heat].map(([name, v]) => ({ name, kind: v.kind, heat: Math.round(v.heat * 100) / 100, why: v.why })).sort((a, b) => b.heat - a.heat);
  return { hooks: hooks.map((h) => ({ ...h, score: Math.round(h.score * 100) / 100 })), heat: heatList };
}

export function toMarkdown(day: string, hooks: Hook[], heat: { name: string; kind: Kind; heat: number }[], errors: string[], counts: Record<string, number>): string {
  const l: string[] = [`# Trend scout ${day}`, ''];
  l.push(`Signals read: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}.`, '');
  if (errors.length) l.push(`Sources that failed (the rest still ran): ${errors.join('; ')}`, '');
  l.push('## Top hooks', '');
  hooks.slice(0, 10).forEach((h, i) => {
    l.push(`${i + 1}. **[${h.type}] ${h.score}**: ${h.headline}${h.coveredIn ? ` (already featured in ${h.coveredIn.map((n) => String(n).padStart(3, '0')).join(', ')})` : ''}`);
    h.why.forEach((w) => l.push(`   - ${w}`));
  });
  l.push('', '## Hottest names', '');
  heat.slice(0, 15).forEach((h) => l.push(`- ${h.name} (${h.kind}): ${h.heat}`));
  l.push('', 'Read only: nothing was posted or changed. Every pitch still needs the owner\'s OK on the hook and script.');
  return l.join('\n') + '\n';
}

/**
 * The story bank, always current: every story's number, title, date and frontmatter players/clubs/countries, plus the
 * extra names a person tagged by hand in data/story-bank.json (people only mentioned in the body). New stories appear
 * on their own; the hand-tagged file only adds names.
 */
export function buildBank(tagged: BankStory[], errors: string[]): BankStory[] {
  const res = loadStories();
  if (res.errors.length) errors.push(...res.errors.slice(0, 3).map((e) => `stories: ${e}`));
  const extra = new Map(tagged.map((t) => [t.slug, t]));
  const uniq = (xs: string[]) => [...new Map(xs.filter(Boolean).map((x) => [core(x), x])).values()];
  return res.stories.map(({ data }) => {
    const t = extra.get(data.slug);
    return {
      number: data.number, slug: data.slug, title: data.title, date: data.date.toISOString().slice(0, 10),
      posted: false, draft: !!data.draft,
      people: uniq([...(data.players ?? []), ...(t?.people ?? [])]),
      clubs: uniq([...(data.clubs ?? []), ...(t?.clubs ?? [])]),
      countries: uniq([...(data.countries ?? []), ...(t?.countries ?? [])]),
      events: t?.events, keywords: t?.keywords,
    };
  }).filter((b) => !b.draft);
}

function readJson<T>(rel: string, fallback: T, errors: string[]): T {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T; } catch (e) { errors.push(`${rel} unreadable (${(e as Error).message.slice(0, 80)})`); return fallback; }
}

async function main() {
  // "Today" is Singapore's calendar date: the morning run is at 05:30 Singapore, still the previous day in UTC.
  const day = new Date(`${process.env.DAY || new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10)}T00:00:00Z`);
  const out = path.resolve(process.env.OUT || path.join(ROOT, 'trend-out'));
  const errors: string[] = [];
  const bank = buildBank(readJson<{ stories: BankStory[] }>('data/story-bank.json', { stories: [] }, errors).stories, errors);
  const anniversaries = readJson<Anniversary[]>('data/football-anniversaries.json', [], errors);
  const fetched = process.env.SIGNALS_IN ? JSON.parse(fs.readFileSync(process.env.SIGNALS_IN, 'utf8')) as { signals: Signal[]; errors: string[] } : await fetchAllSignals(day);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'signals.json'), JSON.stringify(fetched) + '\n');
  errors.push(...fetched.errors);
  if (!fetched.signals.length) {
    console.log(`ERROR: no trend signals could be read. ${errors.join('; ')}`);
    process.exit(1);
  }
  const counts: Record<string, number> = {};
  for (const s of fetched.signals) counts[s.source] = (counts[s.source] ?? 0) + 1;
  const { hooks, heat } = scoreTrends({ signals: fetched.signals, bank, anniversaries, day });
  const dayStr = day.toISOString().slice(0, 10);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'trend-hooks.json'), JSON.stringify({ schema: 1, day: dayStr, read_at: new Date().toISOString(), counts, errors, hooks: hooks.slice(0, 25), heat: heat.slice(0, 40) }, null, 1) + '\n');
  const md = toMarkdown(dayStr, hooks, heat, errors, counts);
  fs.writeFileSync(path.join(out, 'trend-hooks.md'), md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(md);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
