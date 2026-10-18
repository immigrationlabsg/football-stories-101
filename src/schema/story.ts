import { z } from 'zod';

/**
 * The story front matter. This is the single source of truth: the Astro
 * content collection, the validation script and the publish script all use
 * it. `.pages.yml` mirrors it for the CMS form.
 */
export const PILLARS = ['players', 'clubs', 'eras', 'moments'] as const;

export const DEK_MAX = 160;
export const WORDS_MIN = 1100;
export const WORDS_MAX = 1900;

const nonEmpty = (label: string) => z.string().trim().min(1, `${label} is required`);

const stringList = z
  .array(z.string().trim().min(1))
  .default([])
  .transform((list) => Array.from(new Set(list)));

export const heroSchema = z.object({
  src: nonEmpty('hero.src').regex(/^\/images\//, 'hero.src must start with /images/'),
  alt: nonEmpty('hero.alt (alt text is mandatory)'),
  credit: z.string().trim().default('Illustration: Football Stories 101'),
});

export const storySchema = z.object({
  number: z.number().int().positive('number must be a positive integer'),
  title: nonEmpty('title').refine((t) => t.includes(' / '), {
    message: 'title must follow the "Subject / angle" convention, with " / " between the two parts',
  }),
  dek: nonEmpty('dek').max(DEK_MAX, `dek must be ${DEK_MAX} characters or fewer`),
  slug: nonEmpty('slug').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lower-case words joined by hyphens'),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  pillar: z.enum(PILLARS),
  players: stringList,
  clubs: stringList,
  countries: stringList,
  competitions: stringList,
  decades: stringList,
  themes: stringList,
  series: z.string().trim().min(1).nullable().optional().transform((v) => v ?? null),
  seriesOrder: z.number().int().positive().nullable().optional().transform((v) => v ?? null),
  hero: heroSchema,
  sources: z.array(z.string().trim().min(1)).min(1, 'at least one source is required'),
  /** The one-line question to the reader that closes the story. */
  question: z.string().trim().min(1).optional(),
  /** Three to six short facts for the Threads post and the Instagram carousel. */
  facts: z.array(z.string().trim().min(1)).max(6).default([]),
  draft: z.boolean().default(false),
});

export type StoryFrontmatter = z.infer<typeof storySchema>;

export const calendarSchema = z.object({
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  year: z.number().int().optional(),
  text: z.string().trim().min(1),
  /** Slug of a story to link to, if one exists. */
  story: z.string().trim().min(1).optional(),
});

export const correctionSchema = z.object({
  date: z.coerce.date(),
  story: z.string().trim().min(1).optional(),
  text: z.string().trim().min(1),
});

/** Split "Subject / angle" into its two halves. */
export function splitTitle(title: string): { subject: string; angle: string } {
  const idx = title.indexOf(' / ');
  if (idx === -1) return { subject: title, angle: '' };
  return { subject: title.slice(0, idx).trim(), angle: title.slice(idx + 3).trim() };
}

/** "Story No. 001" */
export function storyNumber(n: number): string {
  return `Story No. ${String(n).padStart(3, '0')}`;
}

export function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

/** Rough word count of a Markdown/MDX body: strips front matter, imports, JSX tags and URLs. */
export function countWords(body: string): number {
  const cleaned = body
    .replace(/^import\s.+$/gm, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[#>*_`\[\]()|]/g, ' ');
  return cleaned.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 230));
}

/** URL-safe slug for taxonomy values such as "Real Madrid" or "1950s". */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
