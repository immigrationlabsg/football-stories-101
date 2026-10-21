/**
 * Delivery check, part 2 (workflow "Delivery check"): asks Meta whether the Facebook post of the story whose slot
 * has passed (in the last 24 hours) is actually published. data/sent.json only knows it was scheduled.
 *   npm run check-delivery
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadStories, ROOT } from './lib/stories';

const now = process.env.VERIFY_NOW ? new Date(process.env.VERIFY_NOW) : new Date();
const story = loadStories()
  .stories.filter((s) => !s.data.draft && s.data.date.getTime() <= now.getTime() - 3 * 60e3 && s.data.date.getTime() > now.getTime() - 86_400_000 // Meta can take a moment to publish)
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())[0];
if (!story) {
  console.log('No story slot in the last 24 hours to check.');
  process.exit(0);
}
const n = String(story.data.number).padStart(3, '0');
const records = (JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sent.json'), 'utf8')).social ?? []) as { number: number; network: string; detail: string }[];
const fb = records.find((r) => r.number === story.data.number && r.network === 'facebook');
if (!fb) {
  console.log(`ERROR: story ${n} has no Facebook record at all`);
  process.exit(1);
}
const full = fb.detail.match(/(\d+_\d+)/)?.[1] ?? `${process.env.META_PAGE_ID}_${fb.detail.match(/post (\d+)/)?.[1]}`;
const r = await fetch(`https://graph.facebook.com/v21.0/${full}?fields=is_published,created_time&access_token=${process.env.META_PAGE_ACCESS_TOKEN}`);
const j = (await r.json()) as any;
if (!r.ok || j.error) {
  console.log(`ERROR: story ${n}: Meta says ${j.error?.message ?? r.status}`);
  process.exit(1);
}
if (j.is_published !== true) {
  console.log(`ERROR: story ${n}'s Facebook post is not published (still scheduled or stuck in Meta)`);
  process.exit(1);
}
console.log(`Story ${n} is published on Facebook (${j.created_time}).`);
