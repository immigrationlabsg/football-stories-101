/**
 * Validates every story before a build. Hard errors stop the build; the
 * word-count check is a warning only (spec 6.1).
 */
import { loadStories } from './lib/stories';
import { WORDS_MIN, WORDS_MAX } from '../src/schema/story';
import { INSTAGRAM_LIMIT, socialPosts } from './lib/social';

const { stories, errors, warnings } = loadStories();

for (const s of stories) {
  // "Guess the legend" (owner, 25 Oct 2026): four clues and an answer instead of facts; the body is the short story told
  // after the answer, so the story-shape checks below do not apply.
  if (s.data.format === 'quiz') {
    if (s.data.clues.length !== 4) errors.push(`${s.file}: a Guess the legend quiz needs exactly 4 clues (it has ${s.data.clues.length})`);
    if (!s.data.answer) errors.push(`${s.file}: a Guess the legend quiz needs its answer (the player's name)`);
    if (s.data.facts.length) warnings.push(`${s.file}: a quiz shows clues, not facts; the facts are ignored`);
    if (s.words < 120 || s.words > 300) warnings.push(`${s.file}: the story after the answer is ${s.words} words; aim for 150 to 250`);
    if (!s.data.question) warnings.push(`${s.file}: no reader question; the caption will end without one`);
    continue;
  }
  if (s.words < WORDS_MIN || s.words > WORDS_MAX) {
    warnings.push(`${s.file}: body is ${s.words} words; the target is about 400 (soft limit ${WORDS_MIN} to ${WORDS_MAX})`);
  }
  const social = socialPosts(s, { kind: 'scheduled', webLive: false }).instagram.length;
  if (social > INSTAGRAM_LIMIT) {
    warnings.push(`${s.file}: the Facebook and Instagram text is ${social} characters, over Instagram's ${INSTAGRAM_LIMIT}; Instagram will refuse it`);
  }
  if (s.data.facts.length !== 5) {
    warnings.push(`${s.file}: ${s.data.facts.length} fact(s); the carousel needs exactly 5`);
  }
  if (!s.data.question) {
    warnings.push(`${s.file}: no reader question; the Facebook caption will end without one`);
  }
  if (/^#{1,6}\s/m.test(s.body)) {
    warnings.push(`${s.file}: has section headings; the house format has none`);
  }
  const flat = s.body.replace(/’/g, "'");
  const reveal = flat.search(/Here's (what I (didn't know|only found out)|the part nobody told me)/);
  if (reveal === -1) {
    warnings.push(`${s.file}: no early reveal line ("Here's what I didn't know until recently.")`);
  } else {
    const at = flat.slice(0, reveal).split(/\s+/).filter(Boolean).length;
    if (at > 110) warnings.push(`${s.file}: the reveal line comes at word ${at}; bring it within the first 100 words`);
  }
  const longest = Math.max(0, ...s.body.split(/\n\s*\n/).filter((p) => !/^[<>#]/.test(p.trim())).map((p) => p.split(/\s+/).length));
  if (longest > 70) {
    warnings.push(`${s.file}: a paragraph runs to ${longest} words; keep paragraphs to one to three short sentences`);
  }
}

for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);

console.log(`${stories.length} stor${stories.length === 1 ? 'y' : 'ies'} checked, ${errors.length} error(s), ${warnings.length} warning(s).`);
if (errors.length > 0) process.exit(1);
