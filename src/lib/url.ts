import { SITE_URL, SITE_BASE } from '../site.config';

const base = SITE_BASE === '/' ? '' : SITE_BASE;

/** Prefix a site-relative path ("/stories/x/") with the base path. */
export function withBase(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith('mailto:')) return path;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** Absolute URL for canonical links, feeds, share buttons and emails. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${withBase(path)}`;
}

export const paths = {
  home: () => '/',
  story: (slug: string) => `/stories/${slug}/`,
  allStories: () => '/stories/',
  pillar: (pillar: string) => `/pillars/${pillar}/`,
  taxonomy: (taxonomy: string) => `/topics/${taxonomy}/`,
  term: (taxonomy: string, termSlug: string) => `/topics/${taxonomy}/${termSlug}/`,
  archive: () => '/archive/',
  archiveYear: (year: number) => `/archive/${year}/`,
  archiveMonth: (year: number, month: number) => `/archive/${year}/${String(month).padStart(2, '0')}/`,
  search: () => '/search/',
  about: () => '/about/',
  subscribe: () => '/subscribe/',
  links: () => '/links/',
  privacy: () => '/privacy/',
  corrections: () => '/corrections/',
  rss: () => '/rss.xml',
  ogImage: (number: number) => `/images/derived/${String(number).padStart(3, '0')}-og.png`,
  igCover: (number: number) => `/images/derived/${String(number).padStart(3, '0')}-ig-01.png`,
};
