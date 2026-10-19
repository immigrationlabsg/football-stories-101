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
  const link = linkFor(story, ctx);
  const linkLine = ctx.webLive ? `Read the full story: ${link}` : `Full story in today's email. Subscribe free: ${link}`;
  const prefix = ctx.kind === 'archive' ? 'From the archive · ' : '';
  return [
    `<b>${escapeHtml(prefix + storyNumber(story.data.number))}</b>`,
    `<b>${escapeHtml(subject)}</b> / ${escapeHtml(angle)}`,
    ``,
    escapeHtml(story.data.dek),
    ``,
    escapeHtml(linkLine),
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
  const facebook = [
    plain,
    ``,
    story.data.question ?? '',
    ``,
    `_____`,
    ``,
    `Football's greatest stories, one every morning, free: ${ctx.webLive ? webUrl : absoluteUrl(paths.subscribe())}`,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const instagramFor = (n: number) =>
    [
      `${subject} / ${angle}`,
      ``,
      story.data.dek,
      ``,
      ...facts.slice(0, n).map((f) => `• ${f}`),
      ``,
      `Full story in the link in bio. ${num}${archiveNote}.`,
      ``,
      hashtags(story),
    ].join('\n');
  let instagram = instagramFor(3);
  for (let n = 2; instagram.length > INSTAGRAM_LIMIT && n >= 0; n--) instagram = instagramFor(n);

  const threadsFor = (n: number) =>
    [`${story.data.dek}`, ``, ...facts.slice(0, n).map((f) => `• ${f}`), ``, `${num}: ${subject} / ${angle}. Link in reply.`].join('\n');
  let threads = threadsFor(5);
  for (let n = 4; threads.length > THREADS_LIMIT && n >= 0; n--) threads = threadsFor(n);

  const threadsReply = ctx.webLive ? webUrl : `Subscribe free and read it this morning: ${link}`;
  return { facebook, instagram, threads, threadsReply, webUrl, link };
}

export function socialMarkdown(story: LoadedStory, ctx: SocialContext): string {
  const num = storyNumber(story.data.number);
  const { facebook, instagram, threads, threadsReply, webUrl } = socialPosts(story, ctx);

  return `# ${num} · ${story.data.title}

- Sent: ${ctx.now.toISOString()} (${ctx.kind})
- Web page: ${webUrl}${ctx.webLive ? ' (live)' : ` (live from ${formatDate(new Date(story.data.date.getTime() + 7 * 86_400_000))})`}
- Hero: public${story.data.hero.src}
- Hero alt text: ${story.data.hero.alt}

## Facebook (post the whole text with the picture, exactly as below)

${facebook}

## Instagram (carousel: the cards listed below, in order)

${instagram}

Alt text for the carousel: ${story.data.hero.alt}

## Threads (post the hook and facts, link in the reply)

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
