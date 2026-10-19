/**
 * Schedules each story's Facebook post for its own date and time (workflow "Schedule Facebook posts"),
 * so the whole run shows in Business Suite's Planner. Stories already posted or scheduled are skipped.
 * Instagram and Threads cannot be scheduled through Meta's API; the daily run posts them at the same slot.
 *
 *   npm run schedule-facebook -- 2 30     schedule stories 002 to 030
 *   DRY_RUN=1 npm run schedule-facebook -- 2 30
 */
import { loadStories } from './lib/stories';
import { postStoryToSocials, recordSocial } from './lib/social-post';
import { webLiveDate } from './lib/email';

const [from, to] = process.argv.slice(2).map(Number);
if (!from || !to) throw new Error('Usage: npm run schedule-facebook -- <first story> <last story>');
const dryRun = process.env.DRY_RUN === '1';
const soonest = Date.now() + 15 * 60 * 1000; // Meta needs at least 10 minutes' notice

let failed = 0;
for (const story of loadStories().stories.filter((s) => s.data.number >= from && s.data.number <= to && !s.data.draft)) {
  if (story.data.date.getTime() < soonest) {
    console.log(`${story.data.number}: ${story.data.date.toISOString()} is too soon to schedule; the daily run will post it.`);
    continue;
  }
  const [o] = await postStoryToSocials(story, {
    kind: 'scheduled',
    webLive: webLiveDate(story).getTime() <= Date.now(),
    dryRun,
    networks: ['facebook'],
    scheduleAt: story.data.date,
    skipDone: true,
  });
  if (!dryRun) recordSocial(story.data.number, [o]);
  if (o.status === 'failed') failed++;
}
if (failed) process.exitCode = 1;
