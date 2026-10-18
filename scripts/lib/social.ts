import type { LoadedStory } from './stories';
import { mdxToMarkdown, extractClose, firstParagraph } from './markdown';
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

export function socialMarkdown(story: LoadedStory, ctx: SocialContext): string {
  const { subject, angle } = splitTitle(story.data.title);
  const md = mdxToMarkdown(story.body, { absoluteUrl });
  const close = extractClose(md);
  const opener = firstParagraph(md);
  const link = linkFor(story, ctx);
  const webUrl = absoluteUrl(paths.story(story.data.slug));
  const facts = story.data.facts;
  const num = storyNumber(story.data.number);
  const archiveNote = ctx.kind === 'archive' ? ' (from the archive)' : '';

  const facebook = [
    `${num}${archiveNote}`,
    `${subject} / ${angle}`,
    ``,
    story.data.dek,
    ``,
    opener,
    ``,
    close,
    ``,
    story.data.question ?? '',
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const facebookComment = ctx.webLive
    ? `Full story, with sources: ${webUrl}`
    : `The full story is in this morning's email. Subscribe free and get tomorrow's: ${link}`;

  const instagram = [
    `${subject} / ${angle}`,
    ``,
    story.data.dek,
    ``,
    ...facts.slice(0, 3).map((f) => `• ${f}`),
    ``,
    `Full story in the link in bio. ${num}${archiveNote}.`,
    ``,
    hashtags(story),
  ].join('\n');

  const threads = [
    `${story.data.dek}`,
    ``,
    ...facts.slice(0, 5).map((f) => `• ${f}`),
    ``,
    `${num}: ${subject} / ${angle}. Link in reply.`,
  ].join('\n');

  const threadsReply = ctx.webLive ? webUrl : `Subscribe free and read it this morning: ${link}`;

  return `# ${num} · ${story.data.title}

- Sent: ${ctx.now.toISOString()} (${ctx.kind})
- Web page: ${webUrl}${ctx.webLive ? ' (live)' : ` (live from ${formatDate(new Date(story.data.date.getTime() + 7 * 86_400_000))})`}
- Hero: public${story.data.hero.src}
- Hero alt text: ${story.data.hero.alt}

## Facebook (post as text + the hero image, link in the first comment)

${facebook}

### First comment

${facebookComment}

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
