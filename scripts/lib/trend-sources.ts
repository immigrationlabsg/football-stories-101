/**
 * Trend scout source fetchers: what football fans are reading and searching right now.
 * All sources are free and need no key. One failing source never fails the run; it adds a line to `errors`.
 * Pure parsers are exported so the offline test can run them on saved fixtures.
 */
export const TREND_UA = 'FootballStories101-trend-scout/1.0 (github.com/immigrationlabsg/football-stories-101)';

export type Signal = {
  source: 'wikipedia' | 'bbc' | 'guardian' | 'espn' | 'google-trends' | 'onthisday';
  title: string; // article title, headline, or search term
  url?: string;
  weight: number; // raw size: Wikipedia pageviews, Google Trends approx traffic (e.g. "20000+" -> 20000), or 1 for a headline
  region?: string; // 'en' | 'es' | 'pt' for wikipedia, 'GB' | 'US' | 'SG' for google-trends
  date: string; // ISO date the signal is for
  summary?: string; // RSS description or Trends news headline, trimmed to 300 chars
};

// ------------------------------------------------------------------ helpers

const TIMEOUT_MS = 15_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * GET with a 15 s timeout and one retry. A 429 (Wikimedia rate limit) is retried up to 3 times,
 * waiting for the Retry-After the server gives (capped at 40 s). Returns the body text.
 */
/** Whole-run deadline (set by fetchAllSignals), so the job always finishes inside the workflow's time limit. */
let deadline = Infinity;

export async function getText(url: string): Promise<string> {
  if (Date.now() > deadline) throw new Error('skipped: the 8-minute run limit was reached');
  let lastErr: unknown;
  let tries = 2;
  for (let attempt = 0; attempt < tries; attempt++) {
    let wait = 1500;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': TREND_UA, Accept: '*/*' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: 'follow',
      });
      if (res.status === 429) {
        tries = 4;
        wait = Math.min(40, Number(res.headers.get('retry-after')) || 10) * 1000;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (attempt < tries - 1) {
        if (Date.now() + wait > deadline) break;
        await sleep(wait);
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const getJson = async (url: string): Promise<any> => JSON.parse(await getText(url));

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');

/** Strips tags and entities, collapses spaces, trims to `max` chars. */
export const clean = (s: string, max = 300) => {
  const t = decode(decode(s)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
};

const tag = (block: string, name: string): string | undefined => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : undefined;
};

const items = (xml: string) => xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];

// ------------------------------------------------------------------ football matching

// American / Canadian / Gaelic / Australian football and rugby are not our sport.
const OTHER_CODES = /american football|canadian football|gaelic football|australian rules football|rugby|gridiron|flag football/gi;
const FOOTBALL =
  /footballer|football (club|club in|manager|player|team|coach|referee|stadium|league|competition|tournament)|association football|soccer|\bfifa\b|\buefa\b|\bconmebol\b|national football team|premier league|la liga|serie a\b|bundesliga|ligue 1|champions league|ballon d.or|futbolista|fútbol|futebolista|futebol|club de fútbol|clube de futebol|selección|seleção|copa del rey|liga de campeones|campeonato brasileiro/i;

const DESC_FOOTBALL = /football|soccer|f[uú]tbol|futebol|\bfifa\b|\buefa\b|\bconmebol\b/i;
const STRICT_CAT = /footballers|association football|national football teams|\bfifa\b|\buefa\b|futbolistas|futebolistas|clubes de f[uú]tbol|clubes de futebol/i;

export const isFootballText = (s: string) => FOOTBALL.test(s.replace(OTHER_CODES, ' '));

const JUNK_TITLE = /^(Main_Page|Portal:|Special:|Wikipedia:|Help:|Category:|File:|Template:|Talk:|User:|Especial:|Wikipédia:|Wikipedia_discusión:|Página_principal|Anexo:Deaths|Deaths_in_)/i;
export const isJunkTitle = (t: string) => JUNK_TITLE.test(t) || t === '-' || t === '.xxx';

// ------------------------------------------------------------------ parsers (pure, tested offline)

export function parseWikiTop(json: any, region: string, date: string, limit = 300): Signal[] {
  const arts: { article: string; views: number }[] = json?.items?.[0]?.articles ?? [];
  return arts
    .filter((a) => !isJunkTitle(a.article))
    .slice(0, limit)
    .map((a) => ({
      source: 'wikipedia' as const,
      title: a.article.replace(/_/g, ' '),
      url: `https://${region}.wikipedia.org/wiki/${encodeURIComponent(a.article)}`,
      weight: a.views,
      region,
      date,
    }));
}

/** `pages` is the merged `query.pages` object from the MediaWiki API (description + categories). */
export function footballTitlesFromMeta(pages: Record<string, any>): Set<string> {
  const out = new Set<string>();
  for (const p of Object.values(pages)) {
    const desc: string = p.description ?? '';
    // The short description is the strongest signal; categories alone need several strict hits,
    // because one stray category (a trialist, a club owner) must not make a page "football".
    const cats: string[] = (p.categories ?? []).map((c: any) => String(c.title));
    const strictCats = cats.filter((c) => STRICT_CAT.test(c.replace(OTHER_CODES, ' '))).length;
    if (DESC_FOOTBALL.test(desc.replace(OTHER_CODES, ' ')) || strictCats >= 2) out.add(String(p.title));
  }
  return out;
}

export function parseNewsRss(xml: string, source: 'bbc' | 'guardian' | 'espn', today: string): Signal[] {
  const out: Signal[] = [];
  for (const it of items(xml)) {
    const title = clean(tag(it, 'title') ?? '', 200);
    if (!title) continue;
    const pub = tag(it, 'pubDate');
    const t = pub ? new Date(decode(pub)) : null;
    const desc = clean(tag(it, 'description') ?? '');
    out.push({
      source,
      title,
      url: clean(tag(it, 'link') ?? '', 500) || undefined,
      weight: 1,
      date: t && !isNaN(+t) ? isoDate(t) : today,
      ...(desc ? { summary: desc } : {}),
    });
  }
  return out;
}

/** "20000+" -> 20000, "1,000+" -> 1000, "2M+" -> 2000000, "500K+" -> 500000. */
export function parseTraffic(s: string | undefined): number {
  const m = (s ?? '').replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] ?? '').toUpperCase() as 'K' | 'M' | 'B'] ?? 1;
  return Math.round(parseFloat(m[1]) * mult);
}

export function parseTrends(xml: string, geo: string, today: string): Signal[] {
  const out: Signal[] = [];
  for (const it of items(xml)) {
    const title = clean(tag(it, 'title') ?? '', 200);
    if (!title) continue;
    const news = tag(it, 'ht:news_item');
    const headline = news ? clean(tag(news, 'ht:news_item_title') ?? '') : '';
    const newsUrl = news ? clean(tag(news, 'ht:news_item_url') ?? '', 500) : '';
    const pub = tag(it, 'pubDate');
    const t = pub ? new Date(decode(pub)) : null;
    out.push({
      source: 'google-trends',
      title,
      url: newsUrl || undefined,
      weight: parseTraffic(tag(it, 'ht:approx_traffic')),
      region: geo,
      date: t && !isNaN(+t) ? isoDate(t) : today,
      ...(headline ? { summary: headline } : {}),
    });
  }
  return out;
}

export function parseOnThisDay(json: any, today: string): Signal[] {
  const out: Signal[] = [];
  for (const e of json?.events ?? []) {
    const text: string = e.text ?? '';
    const pages: any[] = e.pages ?? [];
    const blob = [text, ...pages.map((p) => `${p.title ?? ''} ${p.description ?? ''}`)].join(' ');
    if (!isFootballText(blob)) continue;
    out.push({
      source: 'onthisday',
      title: `${e.year}: ${clean(text, 250)}`,
      url: pages[0]?.content_urls?.desktop?.page,
      weight: 1,
      region: 'en',
      date: today,
      summary: clean(text),
    });
  }
  return out;
}

// ------------------------------------------------------------------ fetchers

async function fetchWikipedia(lang: string, prev: Date): Promise<Signal[]> {
  const [y, m, d] = isoDate(prev).split('-');
  const top = await getJson(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${lang}.wikipedia/all-access/${y}/${m}/${d}`);
  const cands = parseWikiTop(top, lang, isoDate(prev), 300);
  const byTitle = new Map(cands.map((c) => [c.title, c]));
  const keep = new Set<string>();
  const titles = cands.map((c) => c.title);
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const pages: Record<string, any> = {};
    let cont: Record<string, string> = {};
    for (let n = 0; n < 6; n++) {
      const qs = new URLSearchParams({
        action: 'query', prop: 'description|categories', titles: batch.join('|'),
        format: 'json', cllimit: 'max', redirects: '1', ...cont,
      });
      const res = await getJson(`https://${lang}.wikipedia.org/w/api.php?${qs}`);
      for (const [id, p] of Object.entries<any>(res.query?.pages ?? {})) {
        const e = (pages[id] ??= { title: p.title, description: p.description, categories: [] });
        e.description ??= p.description;
        e.categories.push(...(p.categories ?? []));
      }
      if (!res.continue) break;
      cont = res.continue;
    }
    for (const t of footballTitlesFromMeta(pages)) keep.add(t);
  }
  return [...keep].map((t) => byTitle.get(t)).filter((s): s is Signal => !!s);
}

/**
 * Runs every source; never throws. `day` is "today" as a calendar date (the scout passes Singapore's date).
 * Wikipedia pageviews use the previous day, or the day before when that isn't published yet (the morning run is at
 * 21:30 UTC, before the previous UTC day is complete). Stops starting requests after `limitMs` (default 8 minutes).
 */
export async function fetchAllSignals(day: Date = new Date(), limitMs = 8 * 60_000): Promise<{ signals: Signal[]; errors: string[] }> {
  deadline = Date.now() + limitMs;
  const today = isoDate(day);
  const prev = new Date(day.getTime() - 86_400_000);
  const prev2 = new Date(day.getTime() - 2 * 86_400_000);
  const mm = today.slice(5, 7);
  const dd = today.slice(8, 10);
  const jobs: { name: string; run: () => Promise<Signal[]> }[] = [
    { name: 'bbc', run: async () => parseNewsRss(await getText('https://feeds.bbci.co.uk/sport/football/rss.xml'), 'bbc', today) },
    { name: 'guardian', run: async () => parseNewsRss(await getText('https://www.theguardian.com/football/rss'), 'guardian', today) },
    { name: 'espn', run: async () => parseNewsRss(await getText('https://www.espn.com/espn/rss/soccer/news'), 'espn', today) },
    ...(['GB', 'US', 'SG'] as const).map((g) => ({
      name: `google-trends-${g}`,
      run: async () => parseTrends(await getText(`https://trends.google.com/trending/rss?geo=${g}`), g, today),
    })),
    { name: 'onthisday', run: async () => parseOnThisDay(await getJson(`https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/${mm}/${dd}`), today) },
  ];
  // Wikipedia languages run one after another so Wikimedia's rate limit is not hit; everything else is parallel.
  const wiki = (['en', 'es', 'pt'] as const).map((l) => ({ name: `wikipedia-${l}`, run: () => fetchWikipedia(l, prev).catch((e) => (/HTTP 404/.test(String(e?.message)) ? fetchWikipedia(l, prev2) : Promise.reject(e))) }));
  jobs.push(...wiki);
  const wikiIdx = new Set(wiki.map((w) => jobs.indexOf(w)));
  let chain: Promise<unknown> = Promise.resolve();
  const results = await Promise.allSettled(
    jobs.map((j, i) => {
      if (!wikiIdx.has(i)) return j.run();
      const p = chain.then(j.run, j.run);
      chain = p.catch(() => undefined);
      return p as Promise<Signal[]>;
    }),
  );
  const signals: Signal[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      signals.push(...r.value);
      // An empty feed is worth seeing (a source that answers but sends nothing); "On this day" can be empty legitimately.
      if (!r.value.length && jobs[i].name !== 'onthisday') errors.push(`${jobs[i].name}: answered but sent 0 items`);
    }
    else errors.push(`${jobs[i].name}: ${String((r.reason as Error)?.message ?? r.reason).slice(0, 150)}`);
  });
  return { signals, errors };
}
