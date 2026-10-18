/**
 * Validates every story before a build. Hard errors stop the build; the
 * word-count check is a warning only (spec 6.1).
 */
import { loadStories } from './lib/stories';
import { WORDS_MIN, WORDS_MAX } from '../src/schema/story';

const { stories, errors, warnings } = loadStories();

for (const s of stories) {
  if (s.words < WORDS_MIN || s.words > WORDS_MAX) {
    warnings.push(`${s.file}: body is ${s.words} words; the target is 1,200 to 1,800 (soft limit ${WORDS_MIN} to ${WORDS_MAX})`);
  }
  if (s.data.facts.length > 0 && s.data.facts.length < 3) {
    warnings.push(`${s.file}: only ${s.data.facts.length} fact(s); the Threads post and Instagram carousel work best with 3 to 5`);
  }
  if (!s.data.question) {
    warnings.push(`${s.file}: no reader question; the Facebook caption will end without one`);
  }
  if (!/what it tells us/i.test(s.body)) {
    warnings.push(`${s.file}: no "What it tells us" heading in the body`);
  }
}

for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);

console.log(`${stories.length} stor${stories.length === 1 ? 'y' : 'ies'} checked, ${errors.length} error(s), ${warnings.length} warning(s).`);
if (errors.length > 0) process.exit(1);
