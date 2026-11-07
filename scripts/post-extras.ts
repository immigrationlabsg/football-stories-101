/**
 * Posts any story limited to some networks (`onlyOn`, e.g. a narrated extra) whose time has come (workflow "Post extras").
 * Started several times around each slot; it waits for the exact time, and data/sent.json stops a second post.
 *
 *   npm run post-extras             post what is due
 *   DRY_RUN=1 npm run post-extras   say what is due, post nothing
 */
import { loadStories } from './lib/stories';
import { postStoryToSocials, recordSocial } from './lib/social-post';
import { webLiveDate } from './lib/email';

const EARLY = 30 * 60e3; // may start this long before the slot and wait
const LATE = 6 * 3600e3; // after this it is no longer "tonight's" post; npm run verify reports it instead
const dryRun = process.env.DRY_RUN === '1';
const now = Date.now();
const due = loadStories().stories
  .filter((s) => !s.data.draft && s.data.onlyOn?.length && s.data.date.getTime() - now < EARLY && now - s.data.date.getTime() < LATE)
  .sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
if (!due.length) console.log('Nothing due.');
for (const story of due) {
  const wait = story.data.date.getTime() - Date.now();
  if (wait > 0 && !dryRun) {
    console.log(`Waiting ${Math.round(wait / 1000)} seconds for ${story.data.date.toISOString()}.`);
    await new Promise((r) => setTimeout(r, wait));
  }
  const outcomes = await postStoryToSocials(story, { kind: 'scheduled', webLive: webLiveDate(story).getTime() <= Date.now(), dryRun, networks: story.data.onlyOn, skipDone: true });
  if (!dryRun) recordSocial(story.data.number, outcomes, story.data.slug);
  // A Threads post whose Reel reply failed is recorded as posted (it is live), so turn the run red: GitHub emails the owner.
  if (outcomes.some((o) => o.status === 'failed' || o.detail.includes('Reel reply FAILED'))) process.exitCode = 1;
}
