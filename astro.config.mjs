// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import { SITE_URL, SITE_BASE } from './src/site.config.ts';
import { remarkPullQuotes } from './src/lib/remark-pullquotes.ts';
import { rehypeTellsUs } from './src/lib/rehype-tells-us.ts';

export default defineConfig({
  site: SITE_URL,
  base: SITE_BASE,
  trailingSlash: 'ignore',
  output: 'static',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  markdown: {
    // remark/rehype pipeline shared by .md and .mdx stories
    processor: unified({
      remarkPlugins: [remarkPullQuotes],
      rehypePlugins: [rehypeTellsUs],
      gfm: true,
      smartypants: true,
    }),
  },
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  image: {
    // Heroes live in /public and are resized by scripts/images.ts, so the
    // Astro image service is only used for the odd inline figure.
    responsiveStyles: true,
  },
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
  devToolbar: { enabled: false },
});
