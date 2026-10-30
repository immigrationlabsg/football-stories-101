import type { LoadedStory } from './stories';
import { mdxToMarkdown, markdownToText } from './markdown';
import { splitTitle, storyNumber, pad3 } from '../../src/schema/story';
import { site } from '../../src/site.config';
import { absoluteUrl, paths } from '../../src/lib/url';
import { formatDate } from '../../src/lib/format';
import { escapeHtml } from './telegram';
import { usesReel } from './reel';

export interface SocialContext {
  kind: 'scheduled' | 'archive';
  now: Date;
  webLive: boolean;
  cardPaths: string[]; // repo-relative paths of the Instagram cards
}

export function linkFor(story: LoadedStory, ctx: { webLive: boolean }): string {
  return ctx.webLive ? absoluteUrl(paths.story(story.data.slug)) : absoluteUrl(paths.subscribe());
}

export function telegramCaption(story: LoadedStory, ctx: { webLive: boolean; kind: 'scheduled' | 'archive' }): string {
  const { subject, angle } = splitTitle(story.data.title);
  const prefix = ctx.kind === 'archive' ? 'From the archive · ' : '';
  return [
    `<b>${escapeHtml(prefix + storyNumber(story.data.number))}</b>`,
    `<b>${escapeHtml(subject)}</b> / ${escapeHtml(angle)}`,
    ``,
    escapeHtml(story.data.dek),
  ].join('\n');
}

export interface SocialPosts {
  facebook: string;
  instagram: string;
  threads: string;
  threadsReply: string;
  webUrl: string;
  link: string;
}

const THREADS_LIMIT = 500;
export const INSTAGRAM_LIMIT = 2200;
/** AI disclosure on every post from the Reels on (owner's decision, 25 Oct 2026): the paintings are made with AI. */
export const AI_NOTE = 'Illustrations made with AI.';

/**
 * Hashtags for Instagram and Facebook (owner, 30 Oct 2026: "do what it takes"): #FootballHistory, then the story's first
 * two clubs and, outside quizzes, its first two players, five at most. A quiz never names its clubs or players: they would
 * give the answer away. Threads takes one topic tag instead, so it gets none.
 */
export function hashtagsFor(data: { format?: string; clubs: string[]; players: string[] }): string {
  const tag = (s: string) =>
    '#' +
    s
      .replace(/æ/g, 'ae').replace(/Æ/g, 'Ae').replace(/[øØ]/g, (c) => (c === 'ø' ? 'o' : 'O')).replace(/ß/g, 'ss')
      .replace(/[łŁ]/g, (c) => (c === 'ł' ? 'l' : 'L')).replace(/[đð]/g, 'd').replace(/[ĐÐ]/g, 'D').replace(/þ/g, 'th').replace(/Þ/g, 'Th')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[’'`]/g, '')
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join('');
  const tags = data.format === 'quiz' ? ['Football History', 'Guess The Legend', 'Football Quiz'] : ['Football History', ...data.clubs.slice(0, 2), ...data.players.slice(0, 2)];
  // A tag needs a letter (#1860 is not a hashtag); a name in another script leaves nothing and is skipped.
  return [...new Set(tags.map(tag).filter((x) => x.length > 2 && /[A-Za-z]/.test(x)))].slice(0, 5).join(' ');
}
/** Hashtags go last; Instagram keeps as many as fit its limit, dropping from the end (the story itself is never cut). */
function withTags(text: string, tags: string): { facebook: string; instagram: string } {
  const add = (t: string[]) => (t.length ? `${text}\n\n${t.join(' ')}` : text);
  const all = tags ? tags.split(' ') : [];
  let keep = all.length;
  while (keep > 0 && add(all.slice(0, keep)).length > INSTAGRAM_LIMIT) keep--;
  return { facebook: add(all), instagram: add(all.slice(0, keep)) };
}

/** The text for each network. Shared by the social/NNN.md file and by the automatic posting. */
export function socialPosts(story: LoadedStory, ctx: { kind: 'scheduled' | 'archive'; webLive: boolean }): SocialPosts {
  const { subject, angle } = splitTitle(story.data.title);
  const md = mdxToMarkdown(story.body, { absoluteUrl });
  const link = linkFor(story, ctx);
  const webUrl = absoluteUrl(paths.story(story.data.slug));
  const num = storyNumber(story.data.number);

  // "Guess the legend" (owner, 25 Oct 2026): the challenge first, the answer only below the "See more" cut, then the short
  // story, the question and the usual sign-off. Threads gets the challenge alone, never the answer.
  if (story.data.format === 'quiz') {
    const igLinkQuiz = (process.env.PUBLIC_INSTAGRAM_URL?.trim() || site.social.instagram).replace(/^https?:\/\/(www\.)?/, '');
    const challenge = `Guess the legend: ${story.data.clues.length} clues, one name. Watch to the end, and no peeking at the comments.`;
    const facebook = [challenge, '', '.', '.', '.', '', `It was ${story.data.answer}.`, '', markdownToText(md), '', story.data.question ?? '', '', '_____', '',
      'Football is full of stories nobody told you. I write one up every morning. Follow Football Stories 101.', '', AI_NOTE]
      .join('\n').replace(/\n{3,}/g, '\n\n').trim();
    const threads = `Guess the legend: ${story.data.clues.length} clues, one name. Swipe one card at a time. How many did you need? The answer comes after the fourth clue.\n${AI_NOTE}`;
    const threadsReply = `The same clues as a Reel, answer at the end. More on Instagram: ${igLinkQuiz}`;
    return { ...withTags(facebook, hashtagsFor(story.data)), threads, threadsReply, webUrl, link };
  }

  // The Morning Founder posts the whole story natively, ending with the question,
  // a rule, and a one-line signature with the link.
  const plain = markdownToText(md);

  // Facebook cuts a post at "See more" after roughly 250 characters. The whole story is posted, but
  // "Here's what I didn't know until recently." is moved up so it starts inside that window: the opening
  // sentences are kept in order up to about 230 characters, then the reveal, then the rest of the opening,
  // then the rest of the story. Nothing is removed.
  const m = /Here[\u2019']s what I didn[\u2019']t know until recently\./.exec(plain);
  const REVEAL = m ? m[0] : "Here's what I didn't know until recently.";
  const afterReveal = m ? plain.slice(m.index + m[0].length).trim() : '';
  const payoff = afterReveal.split(/\n\s*\n/)[0] ?? '';
  const WINDOW = 230;
  let head = '';
  let tailOfOpening = '';
  if (m) {
    const paragraphs = plain.slice(0, m.index).trim().split(/\n\s*\n/);
    let used = 0;
    let full = false;
    const headParas: string[] = [];
    const tailParas: string[] = [];
    for (const para of paragraphs) {
      const sentences = para.split(/(?<=[.!?])\s+/);
      const h: string[] = [];
      const t: string[] = [];
      for (const sentence of sentences) {
        if (!full && (used === 0 || used + sentence.length + 1 <= WINDOW)) {
          h.push(sentence);
          used += sentence.length + 1;
        } else {
          full = true;
          t.push(sentence);
        }
      }
      if (h.length) headParas.push(h.join(' '));
      if (t.length) tailParas.push(t.join(' '));
    }
    head = headParas.join('\n\n');
    tailOfOpening = tailParas.join('\n\n');
  }
  const opening = m ? [head, REVEAL, tailOfOpening, afterReveal].filter(Boolean).join('\n\n') : plain;
  const facebook = [
    opening,
    ``,
    story.data.question ?? '',
    ``,
    `_____`,
    ``,
    `Football is full of stories nobody told you. I write one up every morning. Follow Football Stories 101.`,
    ...(usesReel(story.data.date) ? [``, AI_NOTE] : []),
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Instagram carries the Facebook text, under the Reel, with as many of the hashtags as fit. The story is never cut: if it is over Instagram's
  // 2,200-character limit even without the hashtags, posting stops and says by how much, so the story can be tightened.

  // Threads is a 500-character teaser: the start of the opening, the reveal phrase, and the first line of the payoff,
  // posted with the cards and a topic tag (owner, 27 Oct 2026: Threads did better with cards than with the Reel). The
  // Reel and the Instagram link go in a reply, so the post itself carries no link.
  const igLink = (process.env.PUBLIC_INSTAGRAM_URL?.trim() || site.social.instagram).replace(/^https?:\/\/(www\.)?/, '');
  const threadsTries = m
    ? [
        [head, REVEAL, tailOfOpening, payoff],
        [head, REVEAL, tailOfOpening],
        [head, REVEAL],
      ].map((parts) => parts.filter(Boolean).join('\n\n'))
    : [`${story.data.dek}\n\n${num}: ${subject} / ${angle}.`];
  // Counted in UTF-8 bytes to be safe: Threads counts some characters (emoji) by their byte length.
  const bytes = (t: string) => Buffer.byteLength(t, 'utf8');
  // Room is kept for the AI line: on Threads the Reel (which carries the AI tag) is only in the reply.
  const aiLine = usesReel(story.data.date) ? `\n${AI_NOTE}` : '';
  const room = THREADS_LIMIT - bytes(aiLine);
  let threadsBody = threadsTries.find((t) => bytes(t) <= room) ?? threadsTries[threadsTries.length - 1];
  while (bytes(threadsBody) > room) threadsBody = threadsBody.slice(0, -2) + '…';
  const threads = threadsBody + aiLine;
  const threadsReply = `The whole story as a Reel. More on Instagram: ${igLink}`;
  return { ...withTags(facebook, usesReel(story.data.date) ? hashtagsFor(story.data) : ''), threads, threadsReply, webUrl, link };
}

export function socialMarkdown(story: LoadedStory, ctx: SocialContext): string {
  const num = storyNumber(story.data.number);
  const { facebook, instagram, threads, webUrl } = socialPosts(story, ctx);

  return `# ${num} · ${story.data.title}

- Sent: ${ctx.now.toISOString()} (${ctx.kind})
- Web page (for your reference only, do not post): ${webUrl}${ctx.webLive ? ' (live)' : ` (live from ${formatDate(new Date(story.data.date.getTime() + 7 * 86_400_000))})`}
- Hero: public${story.data.hero.src}
- Hero alt text: ${story.data.hero.alt}

## Facebook (post the whole text with the picture social/cards/${pad3(story.data.number)}-fb.png, exactly as below)

${facebook}

## Instagram (the cards listed below, in order; the Facebook text, without the hashtags if they would pass 2,200 characters)

${instagram}

${instagram.length > INSTAGRAM_LIMIT ? `**Too long for Instagram by ${instagram.length - INSTAGRAM_LIMIT} characters (limit ${INSTAGRAM_LIMIT}).**\n\n` : ''}Alt text for the carousel: ${story.data.hero.alt}

## Threads (the same cards as Instagram with this text, topic tag "Football")

${threads}

Then reply to that post with the Reel (social/cards/NNN-reel.mp4 if present) and this text:

${socialPosts(story, ctx).threadsReply}

## Cards (1080x1350)

${ctx.cardPaths.map((p) => `- ${p}`).join('\n')}
`;
}

export function socialFilename(story: LoadedStory): string {
  return `social/${pad3(story.data.number)}.md`;
}
