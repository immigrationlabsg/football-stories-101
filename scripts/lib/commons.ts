/** Small Wikimedia Commons helpers shared by the reference-photo scripts. */
export const UA = 'FootballStories101/1.0 (https://github.com/immigrationlabsg/football-stories-101)';

export const strip = (h: string) =>
  h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();

/** Public domain, CC0, CC BY or CC BY-SA, and never NC or ND. */
export const free = (l: string) =>
  !/\bnc\b|non-?commercial|\bnd\b|no-?deriv/i.test(l) && /public domain|^pd|cc0|cc[- ]by/i.test(l);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function api(params: Record<string, string>): Promise<any> {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ format: 'json', ...params });
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (attempt === 3) throw new Error(`Commons API ${res.status}`);
    await sleep(2000 * 2 ** attempt);
  }
}

/** Fetches an image, backing off when Wikimedia throttles (it answers 429 with an HTML page). */
export async function image(url: string): Promise<Buffer> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) {
      await sleep(400);
      return Buffer.from(await res.arrayBuffer());
    }
    if (attempt === 4) throw new Error(`image download failed (${res.status})`);
    await sleep(3000 * 2 ** attempt);
  }
}
