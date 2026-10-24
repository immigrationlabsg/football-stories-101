/**
 * Posts one story to Facebook, Instagram and Threads by hand (workflow "Post to social").
 *
 *   DRY_RUN=1 npm run post-social -- 1          show exactly what would be posted and check the pictures are live
 *   npm run post-social -- 1 facebook threads   post for real, to these networks only
 *
 * A real post is recorded in data/sent.json under "social" so the daily run does not repeat it.
 */
import { loadStories } from './lib/stories';
import { postStoryToSocials, recordSocial, type Network } from './lib/social-post';
import { webLiveDate } from './lib/email';

const [num, ...rest] = process.argv.slice(2);
if (!num) throw new Error('Usage: npm run post-social -- <story number> [facebook] [instagram] [threads]');
const { stories } = loadStories();
const story = stories.find((s) => s.data.number === Number.parseInt(num, 10));
if (!story) throw new Error(`No story ${num}`);
const networks = (rest.length ? rest : ['facebook', 'instagram', 'threads']) as Network[];
const dryRun = process.env.DRY_RUN !== '0';

const outcomes = await postStoryToSocials(story, {
  kind: 'scheduled',
  webLive: webLiveDate(story).getTime() <= Date.now(),
  dryRun,
  networks,
  draft: process.env.POST_AS_DRAFT === '1',
  scheduleAt: process.env.SCHEDULE_AT ? new Date(process.env.SCHEDULE_AT) : undefined,
  skipDone: process.env.FORCE !== '1', // never post or schedule a story twice on the same network
});
if (!dryRun) recordSocial(story.data.number, outcomes);
if (outcomes.some((o) => o.status === 'failed' || o.detail.includes('UNCONFIRMED'))) process.exitCode = 1;
