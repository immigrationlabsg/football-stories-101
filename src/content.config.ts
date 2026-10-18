import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { storySchema, calendarSchema, correctionSchema } from './schema/story';

const stories = defineCollection({
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: './src/content/stories' }),
  schema: storySchema,
});

const calendar = defineCollection({
  loader: file('./src/content/calendar/anniversaries.json'),
  schema: calendarSchema,
});

const corrections = defineCollection({
  loader: file('./src/content/corrections.json'),
  schema: correctionSchema,
});

export const collections = { stories, calendar, corrections };
