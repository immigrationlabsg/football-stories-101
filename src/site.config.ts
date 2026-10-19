/**
 * One place for everything about the publication that is not a story.
 * Values with an env override can be changed from GitHub repository
 * variables (Settings -> Secrets and variables -> Actions -> Variables)
 * without touching code.
 */

const env = (key: string, fallback: string): string => {
  const fromProcess =
    typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
  const value = fromProcess ?? fallback;
  return value.trim() === '' ? fallback : value.trim();
};

/** Origin of the site, no trailing slash. */
export const SITE_URL = env('SITE_URL', 'https://immigrationlabsg.github.io').replace(/\/+$/, '');

/** Base path. "/" when served from a custom domain, "/football-stories-101" on github.io. */
export const SITE_BASE = (() => {
  const raw = env('SITE_BASE', '/football-stories-101').trim();
  if (raw === '' || raw === '/') return '/';
  return '/' + raw.replace(/^\/+|\/+$/g, '');
})();

/**
 * Unlisted editor's preview of every story, drafts included, at
 * /preview/<key>/. Not linked, not indexed, not searchable. Change the key
 * (repository variable PREVIEW_KEY) to retire an old preview address.
 */
export const PREVIEW_KEY = env('PREVIEW_KEY', 'editors-desk');

/** Days between the email send and the web publication. */
export const WEB_LAG_DAYS = Number.parseInt(env('WEB_LAG_DAYS', '7'), 10);

export const site = {
  name: 'Football Stories 101',
  shortName: 'FS101',
  tagline: 'One researched football story a day. Players, clubs, eras and moments.',
  description:
    'Football Stories 101 is a free, non-commercial football storytelling publication: one researched story every day, a three-minute read, by email first and on the web a week later.',
  byline: 'The Editor, Football Stories 101',
  language: 'en-GB',
  /** Contact for corrections and takedown requests. Change when the publication has its own mailbox. */
  contactEmail: 'editor@footballstories101.com',
  /** Send times, shown on the Subscribe page and in the runbook. */
  sendTimes: {
    weekdays: '8:00 am Singapore time, Monday to Friday',
    weekends: '10:00 am Singapore time, Saturday and Sunday',
  },
  /** Buttondown newsletter username. Powers the embedded subscribe form. */
  buttondownUsername: env('PUBLIC_BUTTONDOWN_USERNAME', 'footballstories101'),
  /** Public handles. Empty string hides the link. */
  social: {
    telegram: env('PUBLIC_TELEGRAM_CHANNEL', 'https://t.me/footballstories101'),
    facebook: env('PUBLIC_FACEBOOK_URL', 'https://www.facebook.com/footballstories101'),
    instagram: env('PUBLIC_INSTAGRAM_URL', 'https://www.instagram.com/foot.ballstories101'),
    threads: env('PUBLIC_THREADS_URL', 'https://www.threads.net/@foot.ballstories101'),
  },
  /** Optional cookieless analytics (Umami Cloud). Leave empty to load nothing. */
  analytics: {
    umamiScript: env('PUBLIC_UMAMI_SCRIPT', ''),
    umamiWebsiteId: env('PUBLIC_UMAMI_WEBSITE_ID', ''),
  },
  pillars: {
    players: {
      label: 'Players',
      blurb: 'Stars past and present, one-club men, cult heroes and forgotten pioneers.',
    },
    clubs: {
      label: 'Clubs',
      blurb: 'Origins, derby roots, stadium moves, colours and relegation-to-glory arcs.',
    },
    eras: {
      label: 'Eras & Dynasties',
      blurb: 'The teams that owned a decade and the ideas that made them.',
    },
    moments: {
      label: 'Moments',
      blurb: 'Forgotten finals, famous debuts and farewells, the match that changed a club.',
    },
  },
} as const;

export type PillarKey = keyof typeof site.pillars;

/** Taxonomies that get their own index pages. Keys match the front matter. */
export const taxonomies = {
  clubs: { label: 'Clubs', singular: 'club' },
  players: { label: 'Players', singular: 'player' },
  countries: { label: 'Countries', singular: 'country' },
  competitions: { label: 'Competitions', singular: 'competition' },
  decades: { label: 'Decades', singular: 'decade' },
  themes: { label: 'Themes', singular: 'theme' },
  series: { label: 'Series', singular: 'series' },
} as const;

export type TaxonomyKey = keyof typeof taxonomies;
