import type { LoadedStory } from './stories';
import { mdxToMarkdown } from './markdown';
import { splitTitle, storyNumber } from '../../src/schema/story';
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

  // Mirrors The Morning Founder: name, dek, read-online link, picture with caption,
  // the story in short paragraphs, the question, a quiet footer.
  return [
    ctx.kind === 'archive' ? `*From the archive.*\n` : '',
    `# ${subject}`,
    ``,
    `**${angle || story.data.dek}**`,
    ``,
    angle ? `${story.data.dek}` : '',
    ``,
    isLive ? `[Read online](${url})` : `[Read online from ${formatDate(live)}](${url})`,
    ``,
    `![${story.data.hero.alt}](${absoluteUrl(story.data.hero.src)})`,
    ``,
    `*${subject}. ${story.data.hero.credit}*`,
    ``,
    body,
    ``,
    story.data.question ? `**${story.data.question}**` : '',
    ``,
    `Hit reply and tell me.`,
    ``,
    `---`,
    ``,
    `${storyNumber(story.data.number)} · ${site.name}. Every fact in this story is checked against two sources; they are listed on [the web page](${url}).`,
    ``,
    `Forward this to a football friend. They can subscribe free at ${absoluteUrl(paths.subscribe())}. No email? Follow on Telegram: ${site.social.telegram}`,
    ``,
    `[Unsubscribe]({{ unsubscribe_url }})`,
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}
