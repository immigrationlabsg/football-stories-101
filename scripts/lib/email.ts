import type { LoadedStory } from './stories';
import { mdxToMarkdown } from './markdown';
import { splitTitle, storyNumber, readingMinutes } from '../../src/schema/story';
import { site, WEB_LAG_DAYS } from '../../src/site.config';
import { absoluteUrl, paths } from '../../src/lib/url';
import { formatDate, addDays } from '../../src/lib/format';

export interface EmailContext {
  kind: 'scheduled' | 'archive';
  now: Date;
}

export function emailSubject(story: LoadedStory, ctx: EmailContext): string {
  const base = `${storyNumber(story.data.number)} · ${story.data.title}`;
  return ctx.kind === 'archive' ? `From the archive: ${base}` : base;
}

export function webLiveDate(story: LoadedStory): Date {
  return addDays(story.data.date, WEB_LAG_DAYS);
}

export function emailMarkdown(story: LoadedStory, ctx: EmailContext): string {
  const { subject, angle } = splitTitle(story.data.title);
  const url = absoluteUrl(paths.story(story.data.slug));
  const live = webLiveDate(story);
  const isLive = live.getTime() <= ctx.now.getTime();
  const body = mdxToMarkdown(story.body, { absoluteUrl });
  const sources = story.data.sources.map((s, i) => `${i + 1}. ${s}`).join('\n');
  const pillar = site.pillars[story.data.pillar].label;
  const minutes = readingMinutes(story.words);

  const intro =
    ctx.kind === 'archive'
      ? `*From the archive. No new story was due today, so here is one whose anniversary is close.*\n\n`
      : '';

  return [
    `![${story.data.hero.alt}](${absoluteUrl(story.data.hero.src)})`,
    ``,
    `**${storyNumber(story.data.number)} · ${pillar}** · ${formatDate(story.data.date)} · ${minutes} min read`,
    ``,
    `# ${angle || subject}`,
    ``,
    `**${subject}**`,
    ``,
    `*${story.data.dek}*`,
    ``,
    intro + body,
    ``,
    story.data.question ? `*${story.data.question}* Reply to this email and tell me.` : `Reply to this email and tell me what you think.`,
    ``,
    `---`,
    ``,
    `**Sources**`,
    ``,
    sources,
    ``,
    `---`,
    ``,
    `Written by ${site.byline}. ${story.data.hero.credit}.`,
    ``,
    isLive
      ? `Read and share this story on the web: ${url}`
      : `This story will be on the website from ${formatDate(live)}: ${url}`,
    ``,
    `Forward this to a football friend. They can subscribe free at ${absoluteUrl(paths.subscribe())}. Prefer no email? The Telegram channel: ${site.social.telegram}`,
    ``,
    `You are receiving this because you subscribed to ${site.name}. [Unsubscribe]({{ unsubscribe_url }}) at any time.`,
  ].join('\n');
}
