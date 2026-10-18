/**
 * Loads stories straight from disk for the scripts that run outside Astro
 * (validate, images, publish). Same schema as the content collection.
 */
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { storySchema, type StoryFrontmatter, countWords } from '../../src/schema/story';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
export const STORIES_DIR = path.join(ROOT, 'src/content/stories');
export const PUBLIC_DIR = path.join(ROOT, 'public');

export interface LoadedStory {
  file: string;
  data: StoryFrontmatter;
  body: string;
  words: number;
}

export interface LoadResult {
  stories: LoadedStory[];
  errors: string[];
  warnings: string[];
}

export function loadStories(): LoadResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stories: LoadedStory[] = [];
  if (!fs.existsSync(STORIES_DIR)) return { stories, errors: [`Missing ${STORIES_DIR}`], warnings };

  const files = fs
    .readdirSync(STORIES_DIR)
    .filter((f) => /\.(md|mdx)$/.test(f) && !f.startsWith('_'))
    .sort();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(STORIES_DIR, file), 'utf8');
    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(raw);
    } catch (e) {
      errors.push(`${file}: cannot parse front matter (${(e as Error).message})`);
      continue;
    }
    const result = storySchema.safeParse(parsed.data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors.push(`${file}: ${issue.path.join('.') || 'front matter'}: ${issue.message}`);
      }
      continue;
    }
    const body = parsed.content;
    stories.push({ file, data: result.data, body, words: countWords(body) });
  }

  // Cross-file checks
  const byNumber = new Map<number, string>();
  const bySlug = new Map<string, string>();
  for (const s of stories) {
    const n = byNumber.get(s.data.number);
    if (n) errors.push(`${s.file}: duplicate number ${s.data.number} (also in ${n})`);
    byNumber.set(s.data.number, s.file);
    const sl = bySlug.get(s.data.slug);
    if (sl) errors.push(`${s.file}: duplicate slug "${s.data.slug}" (also in ${sl})`);
    bySlug.set(s.data.slug, s.file);
    const heroPath = path.join(PUBLIC_DIR, s.data.hero.src);
    if (!fs.existsSync(heroPath)) errors.push(`${s.file}: hero image not found at public${s.data.hero.src}`);
  }

  stories.sort((a, b) => a.data.number - b.data.number);
  return { stories, errors, warnings };
}
