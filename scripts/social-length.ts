/**
 * Prints how long each story's Facebook and Instagram text is (they are the same text), against
 * Instagram's 2,200-character caption limit. Exits with an error if any story is over.
 *   npm run social-length            all stories
 *   npm run social-length -- 3 17    just these
 */
import { loadStories } from './lib/stories';
import { INSTAGRAM_LIMIT, socialPosts } from './lib/social';

const only = process.argv.slice(2).map(Number);
let over = 0;
for (const s of loadStories().stories) {
  if (only.length && !only.includes(s.data.number)) continue;
  const n = socialPosts(s, { kind: 'scheduled', webLive: false }).instagram.length;
  if (n > INSTAGRAM_LIMIT) over++;
  console.log(`${String(s.data.number).padStart(3, '0')}  ${s.words} words  ${n} characters  ${n > INSTAGRAM_LIMIT ? `OVER by ${n - INSTAGRAM_LIMIT}` : 'fits'}`);
}
if (over) {
  console.error(`${over} story(ies) over Instagram's ${INSTAGRAM_LIMIT}-character limit`);
  process.exit(1);
}
