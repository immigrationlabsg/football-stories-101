import type { LoadedStory } from './stories';
import { mdxToMarkdown, markdownToText } from './markdown';
import { splitTitle, storyNumber, pad3, slugify } from '../../src/schema/story';
import { site } from '../../src/site.config';
import { absoluteUrl, paths } from '../../src/lib/url';
import { formatDate } from '../../src/lib/format';
import { escapeHtml } from './telegram';

export interface SocialContext {
  kind: 'scheduled' | 'archive';
  now: Date;
  webLive: boolean;
  cardPaths: string[]; // repo-relative paths of the Instagram cards
}

function hashtags(story: LoadedStory): string {
  const tags = new Set<string>(['FootballStories101', 'FootballHistory', 'Football']);
  for (const v of [...story.data.players, ...story.data.clubs, ...story.data.competitions, ...story.data.decades]) {
    const t = slugify(v)
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('');
    if (t && /^[A-Za-z]/.test(t)) tags.add(t);
  }
  return Array.from(tags)
    .slice(0, 12)
    .map((t) => `#${t}`)
    .join(' ');
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
const INSTAGRAM_LIMIT = 2200;

/** The text for each network. Shared by the social/NNN.md file and by the automatic posting. */
export function socialPosts(story: LoadedStory, ctx: { kind: 'scheduled' | 'archive'; webLive: boolean }): SocialPosts {
  const { subject, angle } = splitTitle(story.data.title);
  const md = mdxToMarkdown(story.body, { absoluteUrl });
  const link = linkFor(story, ctx);
  const webUrl = absoluteUrl(paths.story(story.data.slug));
  const facts = story.data.facts;
  const num = storyNumber(story.data.number);
  const archiveNote = ctx.kind === 'archive' ? ' (from the archive)' : '';

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
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Instagram shows about 125 characters before "more": the one-line hook, then the reveal phrase.
  const igHook = story.data.hook ?? `${subject} / ${angle}`;
  const instagramFor = (n: number) =>
    [
      igHook,
      ``,
      REVEAL,
      ``,
      payoff || story.data.dek,
      ``,
      ...facts.slice(0, n).map((f) => `• ${f}`),
      ``,
      `Follow for one true football story every morning. ${num}${archiveNote}.`,
      ``,
      hashtags(story),
    ].join('\n');
  let instagram = instagramFor(3);
  for (let n = 2; instagram.length > INSTAGRAM_LIMIT && n >= 0; n--) instagram = instagramFor(n);

  // Threads is a 500-character teaser: the start of the opening, the reveal phrase, and the first line of the payoff.
  const threadsTries = m
    ? [
        [head, REVEAL, tailOfOpening, payoff],
        [head, REVEAL, tailOfOpening],
        [head, REVEAL],
      ].map((parts) => parts.filter(Boolean).join('\n\n'))
    : [`${story.data.dek}\n\n${num}: ${subject} / ${angle}.`];
  const threads = threadsTries.find((t) => t.length <= THREADS_LIMIT) ?? threadsTries[threadsTries.length - 1].slice(0, THREADS_LIMIT - 1) + '…';

  const threadsReply = `More on Instagram: ${process.env.PUBLIC_INSTAGRAM_URL?.trim() || site.social.instagram}`;
  return { facebook, instagram, threads, threadsReply, webUrl, link };
}

export function socialMarkdown(story: LoadedStory, ctx: SocialContext): string {
  const num = storyNumber(story.data.number);
  const { facebook, instagram, threads, threadsReply, webUrl } = socialPosts(story, ctx);

  return `# ${num} · ${story.data.title}

- Sent: ${ctx.now.toISOString()} (${ctx.kind})
- Web page (for your reference only, do not post): ${webUrl}${ctx.webLive ? ' (live)' : ` (live from ${formatDate(new Date(story.data.date.getTime() + 7 * 86_400_000))})`}
- Hero: public${story.data.hero.src}
- Hero alt text: ${story.data.hero.alt}

## Facebook (post the whole text with the picture social/cards/${pad3(story.data.number)}-fb.png, exactly as below)

${facebook}

## Instagram (carousel: the cards listed below, in order)

${instagram}

Alt text for the carousel: ${story.data.hero.alt}

## Threads (post the hook and facts, then the Instagram page as a reply)

${threads}

### Reply

${threadsReply}

## Cards (1080x1350)

${ctx.cardPaths.map((p) => `- ${p}`).join('\n')}
`;
}

export function socialFilename(story: LoadedStory): string {
  return `social/${pad3(story.data.number)}.md`;
}
