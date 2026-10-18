import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { loadRenderers } from 'astro:container';
import { getContainerRenderer as mdxRenderer } from '@astrojs/mdx/container-renderer';
import { getPublishedStories } from '../lib/stories';
import PullQuote from '../components/PullQuote.astro';
import Timeline from '../components/Timeline.astro';
import Figure from '../components/Figure.astro';
import { storyNumber } from '../schema/story';
import { absoluteUrl, paths } from '../lib/url';
import { site, SITE_URL } from '../site.config';

export async function GET(context: APIContext) {
  const stories = (await getPublishedStories()).slice(0, 30);
  const renderers = await loadRenderers([mdxRenderer()]);
  const container = await AstroContainer.create({ renderers });

  const items = [];
  for (const story of stories) {
    const { Content } = await render(story);
    let html = await container.renderToString(Content, { props: { components: { PullQuote, Timeline, Figure } } });
    // Make every root-relative link and image absolute for feed readers.
    html = html.replace(/(href|src)="\/(?!\/)/g, `$1="${SITE_URL}/`);
    const sources = story.data.sources
      .map((s) => (/^https?:\/\//.test(s) ? `<li><a href="${s}">${s}</a></li>` : `<li>${escapeHtml(s)}</li>`))
      .join('');
    const body = [
      `<p><img src="${absoluteUrl(story.data.hero.src)}" alt="${escapeHtml(story.data.hero.alt)}" /></p>`,
      `<p><em>${escapeHtml(story.data.dek)}</em></p>`,
      html,
      story.data.question ? `<p><em>${escapeHtml(story.data.question)}</em></p>` : '',
      `<h2>Sources</h2><ol>${sources}</ol>`,
      `<p>By ${escapeHtml(site.byline)}. <a href="${absoluteUrl(paths.story(story.data.slug))}">Read on the web</a> · <a href="${absoluteUrl(paths.subscribe())}">Get the next story by email</a></p>`,
    ].join('\n');
    items.push({
      title: `${storyNumber(story.data.number)} · ${story.data.title}`,
      description: story.data.dek,
      pubDate: story.data.date,
      link: paths.story(story.data.slug),
      content: body,
      categories: [site.pillars[story.data.pillar].label, ...story.data.clubs, ...story.data.players],
      author: site.byline,
      enclosure: undefined,
    });
  }

  return rss({
    title: site.name,
    description: site.description,
    site: absoluteUrl('/'),
    items: items.map((i) => ({ ...i, link: new URL(absoluteUrl(i.link)).toString() })),
    customData: `<language>${site.language.toLowerCase()}</language><managingEditor>${site.contactEmail} (${site.byline})</managingEditor>`,
    trailingSlash: false,
    stylesheet: false,
  });
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
