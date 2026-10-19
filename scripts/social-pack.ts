/**
 * Writes the social posts for one story without sending anything:
 * social/NNN.md (Facebook, Instagram, Threads, Telegram text) and the
 * Instagram carousel cards in social/cards/. For posting by hand.
 *
 *   npm run social -- 1
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadStories, ROOT, PUBLIC_DIR } from './lib/stories';
import { socialMarkdown, telegramCaption } from './lib/social';
import { webLiveDate } from './lib/email';
import { pad3 } from '../src/schema/story';

const n = Number(process.argv[2]);
const { stories } = loadStories();
const story = stories.find((s) => s.data.number === n);
if (!story) {
  console.error(`No story number ${process.argv[2]}`);
  process.exit(1);
}
const now = new Date();
const webLive = webLiveDate(story).getTime() <= now.getTime() && !story.data.draft;
const outDir = path.join(ROOT, 'social');
const cardsOut = path.join(outDir, 'cards');
fs.mkdirSync(cardsOut, { recursive: true });
const derived = path.join(PUBLIC_DIR, 'images/derived');
const cardPaths: string[] = [];
// The Facebook picture goes with the Instagram cards.
const fbCard = `${pad3(n)}-fb.png`;
if (fs.existsSync(path.join(derived, fbCard))) fs.copyFileSync(path.join(derived, fbCard), path.join(cardsOut, fbCard));
for (const f of fs.readdirSync(derived).filter((f) => f.startsWith(`${pad3(n)}-ig-`)).sort()) {
  fs.copyFileSync(path.join(derived, f), path.join(cardsOut, f));
  cardPaths.push(`social/cards/${f}`);
}
const tg = telegramCaption(story, { webLive, kind: 'scheduled' }).replace(/<\/?b>/g, '');
const md = socialMarkdown(story, { kind: 'scheduled', now, webLive, cardPaths }) + `\n## Telegram\n\n${tg}\n`;
fs.writeFileSync(path.join(outDir, `${pad3(n)}.md`), md);
console.log(`wrote social/${pad3(n)}.md and ${cardPaths.length} cards`);
