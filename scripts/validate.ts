/**
 * Validates every story before a build. Hard errors stop the build; the
 * word-count check is a warning only (spec 6.1).
 */
import { loadStories } from './lib/stories';
import { WORDS_MIN, WORDS_MAX } from '../src/schema/story';
import { INSTAGRAM_LIMIT, socialPosts } from './lib/social';

const { stories, errors, warnings } = loadStories();

for (const s of stories) {
  if (s.words < WORDS_MIN || s.words > WORDS_MAX) {
    warnings.push(`${s.file}: body is ${s.words} words; the target is about 400 (soft limit ${WORDS_MIN} to ${WORDS_MAX})`);
  }
  const social = socialPosts(s, { kind: 'scheduled', webLive: false }).facebook.length;
  if (social > INSTAGRAM_LIMIT) {
    warnings.push(`${s.file}: the Facebook and Instagram text is ${social} characters, over Instagram's ${INSTAGRAM_LIMIT}; Instagram will refuse it`);
  }
  if (s.data.facts.length !== 5) {
    warnings.push(`${s.file}: ${s.data.facts.length} fact(s); the 7-card Instagram carousel needs exactly 5`);
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
