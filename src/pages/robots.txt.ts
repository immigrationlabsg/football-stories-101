import type { APIRoute } from 'astro';
import { absoluteUrl } from '../lib/url';

export const GET: APIRoute = () =>
  new Response(
    [
      'User-agent: *',
      'Allow: /',
      `Disallow: ${absoluteUrl('/search/').replace(/^https?:\/\/[^/]+/, '')}`,
      '',
      `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
