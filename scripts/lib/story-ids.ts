/**
 * Which story a Meta post id belongs to, read from data/sent.json (shared by scripts/insights.ts and its check).
 * A record's detail text holds the post's id: "reel media N", "thread N", "reel N", "post N", or, for older Facebook
 * posts, "<pageId>_<postId>". The Page id is the same in every Facebook record, so it must never be a lookup key:
 * a pair is stored as the full pair and as the post id after the underscore only.
 */
export type SentRecord = { number: number; detail: string };

export function storyIdMap(social: SentRecord[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of social) {
    let rest = String(r.detail);
    for (const m of rest.matchAll(/(\d{9,})_(\d{9,})/g)) {
      map.set(m[0], r.number);
      map.set(m[2], r.number); // the post id; m[1] is the Page id and is never stored
    }
    rest = rest.replace(/\d{9,}_\d{9,}/g, ' ');
    for (const id of rest.match(/\d{9,}/g) ?? []) map.set(id, r.number);
  }
  return map;
}

/** Full id first; then, for "<pageId>_<postId>", the post id alone. Never the Page id. */
export function storyForId(map: Map<string, number>, id: string | undefined): number | null {
  if (!id) return null;
  const direct = map.get(id);
  if (direct !== undefined) return direct;
  const post = id.includes('_') ? id.split('_').slice(1).join('_') : '';
  return post ? map.get(post) ?? null : null;
}
