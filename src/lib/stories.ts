import { getCollection, type CollectionEntry } from 'astro:content';
import { WEB_LAG_DAYS, taxonomies, type TaxonomyKey } from '../site.config';
import { countWords, readingMinutes, slugify, splitTitle } from '../schema/story';
import { addDays } from './format';

export type Story = CollectionEntry<'stories'>;

/**
 * "Now" for the build. Overridable with BUILD_NOW (ISO date) for testing
 * what the site will look like on a given day.
 */
export function buildNow(): Date {
  const override = typeof process !== 'undefined' ? process.env.BUILD_NOW : undefined;
  return override ? new Date(override) : new Date();
}

/** The instant before which a story's email date must fall to be on the web. */
export function webCutoff(now = buildNow()): Date {
  return addDays(now, -WEB_LAG_DAYS);
}

export function isWebPublished(story: Story, now = buildNow()): boolean {
  return !story.data.draft && story.data.date.getTime() <= webCutoff(now).getTime();
}

/** Every story including drafts, by number. Editor's preview only. */
export async function getAllStories(): Promise<Story[]> {
  const all = await getCollection('stories');
  assertUniqueNumbers(all);
  return all.sort((a, b) => a.data.number - b.data.number);
}

/** Human status line for the editor's preview. */
export function storyStatus(story: Story, now = buildNow()): string {
  const d = story.data.date;
  const fmt = (x: Date) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' }).format(x);
  if (story.data.draft) return 'Draft';
  if (d.getTime() > now.getTime()) return `Scheduled, email ${fmt(d)}`;
  if (!isWebPublished(story, now)) return `Emailed ${fmt(d)}, on the web ${fmt(addDays(d, WEB_LAG_DAYS))}`;
  return 'Live on the web';
}

/** Stories that are live on the web, newest first. */
export async function getPublishedStories(now = buildNow()): Promise<Story[]> {
  const all = await getCollection('stories');
  assertUniqueNumbers(all);
  return all
    .filter((s) => isWebPublished(s, now))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || b.data.number - a.data.number);
}

/**
 * Stories that have gone out by email but are not yet on the web. Used for
 * the "Today's story is in your inbox" prompt. Never rendered in full.
 */
export async function getInboxOnlyStories(now = buildNow()): Promise<Story[]> {
  const all = await getCollection('stories');
  const cutoff = webCutoff(now).getTime();
  return all
    .filter((s) => !s.data.draft && s.data.date.getTime() <= now.getTime() && s.data.date.getTime() > cutoff)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

function assertUniqueNumbers(all: Story[]) {
  const seen = new Map<number, string>();
  for (const s of all) {
    const prev = seen.get(s.data.number);
    if (prev) throw new Error(`Duplicate story number ${s.data.number}: ${prev} and ${s.id}`);
    seen.set(s.data.number, s.id);
  }
}

export function storyWords(story: Story): number {
  return countWords(story.body ?? '');
}

export function storyReadingMinutes(story: Story): number {
  return readingMinutes(storyWords(story));
}

export function storyTitleParts(story: Story) {
  return splitTitle(story.data.title);
}

export interface Term {
  taxonomy: TaxonomyKey;
  value: string;
  slug: string;
  stories: Story[];
}

/** Every value of a taxonomy with its stories, most-used first then alphabetical. */
export function termsFor(stories: Story[], taxonomy: TaxonomyKey): Term[] {
  const map = new Map<string, Term>();
  for (const s of stories) {
    const values =
      taxonomy === 'series' ? (s.data.series ? [s.data.series] : []) : (s.data[taxonomy] as string[]);
    for (const value of values) {
      const slug = slugify(value);
      const term = map.get(slug) ?? { taxonomy, value, slug, stories: [] };
      term.stories.push(s);
      map.set(slug, term);
    }
  }
  const terms = Array.from(map.values());
  for (const t of terms) {
    t.stories.sort((a, b) =>
      taxonomy === 'series'
        ? (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0) || a.data.number - b.data.number
        : b.data.date.getTime() - a.data.date.getTime(),
    );
  }
  return terms.sort((a, b) => b.stories.length - a.stories.length || a.value.localeCompare(b.value));
}

export function allTerms(stories: Story[]): Term[] {
  return (Object.keys(taxonomies) as TaxonomyKey[]).flatMap((t) => termsFor(stories, t));
}

/** Related stories by shared club, pillar and decade, scored at build. */
export function relatedStories(story: Story, pool: Story[], limit = 4): Story[] {
  const scored = pool
    .filter((s) => s.id !== story.id)
    .map((s) => {
      let score = 0;
      score += overlap(story.data.clubs, s.data.clubs) * 4;
      score += overlap(story.data.players, s.data.players) * 4;
      score += overlap(story.data.competitions, s.data.competitions) * 2;
      score += overlap(story.data.decades, s.data.decades) * 2;
      score += overlap(story.data.countries, s.data.countries);
      score += overlap(story.data.themes, s.data.themes);
      if (s.data.pillar === story.data.pillar) score += 1;
      if (story.data.series && s.data.series === story.data.series) score += 3;
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.s.data.date.getTime() - a.s.data.date.getTime());
  return scored.slice(0, limit).map((x) => x.s);
}

function overlap(a: readonly string[], b: readonly string[]): number {
  const set = new Set(a.map((x) => x.toLowerCase()));
  return b.filter((x) => set.has(x.toLowerCase())).length;
}

/** Previous and next story within the same series. */
export function seriesNeighbours(story: Story, pool: Story[]) {
  if (!story.data.series) return { prev: null, next: null };
  const run = pool
    .filter((s) => s.data.series === story.data.series)
    .sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0) || a.data.number - b.data.number);
  const i = run.findIndex((s) => s.id === story.id);
  return { prev: i > 0 ? run[i - 1] : null, next: i >= 0 && i < run.length - 1 ? run[i + 1] : null };
}

/** Previous and next by story number. */
export function numberNeighbours(story: Story, pool: Story[]) {
  const sorted = [...pool].sort((a, b) => a.data.number - b.data.number);
  const i = sorted.findIndex((s) => s.id === story.id);
  return { prev: i > 0 ? sorted[i - 1] : null, next: i >= 0 && i < sorted.length - 1 ? sorted[i + 1] : null };
}

/** Group stories by year and month for the archive. */
export function archiveTree(stories: Story[]) {
  const years = new Map<number, Map<number, Story[]>>();
  for (const s of stories) {
    const y = s.data.date.getUTCFullYear();
    const m = s.data.date.getUTCMonth() + 1;
    if (!years.has(y)) years.set(y, new Map());
    const months = years.get(y)!;
    if (!months.has(m)) months.set(m, []);
    months.get(m)!.push(s);
  }
  return Array.from(years.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({
      year,
      months: Array.from(months.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([month, list]) => ({ month, stories: list })),
    }));
}
