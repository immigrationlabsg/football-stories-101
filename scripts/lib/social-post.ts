import type { LoadedStory } from './stories';
import { INSTAGRAM_LIMIT, socialPosts } from './social';
import { UnconfirmedReel, metaConfigured, postFacebookPhoto, postFacebookReel, setFacebookReelCover, postInstagramCarousel, postInstagramReel, postThreads, waitForUrl } from './meta';
import { musicTag, usesReel } from './reel';
import { absoluteUrl } from '../../src/lib/url';
import { pad3 } from '../../src/schema/story';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './stories';

export type Network = 'facebook' | 'instagram' | 'threads';
export type Outcome = { network: Network; status: 'posted' | 'drafted' | 'dry-run' | 'skipped' | 'failed'; detail: string; reel?: string };


const SENT = path.join(ROOT, 'data/sent.json');
type SocialRecord = { number: number; network: Network; status?: 'posted' | 'scheduled'; at: string; detail: string; story?: string; reel?: string };

// The hash each Reel online was made from (reels.json, written by scripts/images.ts): it changes whenever the video does.
// Kept on each Facebook Reel record, so "Reels replace" re-uploads only Reels whose video has really changed.
let liveHashes: Record<string, string> | null = null;
export async function liveReelHash(number: number): Promise<string | undefined> {
  if (!liveHashes) {
    try {
      const r = await fetch(absoluteUrl('/images/derived/reels.json'));
      liveHashes = r.ok ? ((await r.json()) as Record<string, string>) : {};
    } catch {
      liveHashes = {};
    }
  }
  return liveHashes[pad3(number)];
}

/** The Threads topic tag from data/schedule.json threads_topic (empty: none). */
function threadsTopic(): string {
  try {
    return String(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/schedule.json'), 'utf8')).threads_topic ?? '').trim();
  } catch {
    return '';
  }
}

/** Networks this story has already been posted or scheduled to (from data/sent.json). */
export function socialDone(number: number): Set<Network> {
  try {
    const records = (JSON.parse(fs.readFileSync(SENT, 'utf8')).social ?? []) as SocialRecord[];
    return new Set(records.filter((r) => r.number === number).map((r) => r.network));
  } catch {
    return new Set();
  }
}

/**
 * Adds real posts and scheduled Facebook posts to data/sent.json, keeping everything else in the file. Each record names
 * its story (slug), so a slot handed to another story is caught by the Reels switch and by npm run verify.
 */
export function recordSocial(number: number, outcomes: Outcome[], story: string): void {
  const keep = outcomes.filter((o) => o.status === 'posted' || (o.status === 'drafted' && o.detail.startsWith('scheduled')));
  if (!keep.length) return;
  const file = JSON.parse(fs.readFileSync(SENT, 'utf8'));
  file.social = [
    ...(file.social ?? []),
    ...keep.map((o): SocialRecord => ({ number, network: o.network, status: o.status === 'posted' ? 'posted' : 'scheduled', at: new Date().toISOString(), detail: o.detail, story, ...(o.reel ? { reel: o.reel } : {}) })),
  ];
  fs.writeFileSync(SENT, JSON.stringify(file, null, 2) + '\n');
}

/** Posts one story to the chosen networks. Never throws: each network reports its own outcome. */
export async function postStoryToSocials(
  story: LoadedStory,
  opts: { kind: 'scheduled' | 'archive'; webLive: boolean; dryRun: boolean; networks?: Network[]; draft?: boolean; scheduleAt?: Date; skipDone?: boolean },
): Promise<Outcome[]> {
  const networks = opts.networks ?? ['facebook', 'instagram', 'threads'];
  const posts = socialPosts(story, opts);
  const configured = metaConfigured();
  const n = pad3(story.data.number);
  const heroUrl = absoluteUrl(`/images/derived/${n}-fb.png`); // the headline card for Facebook
  // The Instagram carousel: the cover, one card per fact, and the closing card.
  const cardCount = story.data.format === 'quiz' ? story.data.clues.length + 3 : story.data.facts.length + 2;
  const cardUrls = Array.from({ length: cardCount }, (_, i) => absoluteUrl(`/images/derived/${n}-ig-${String(i + 1).padStart(2, '0')}.png`));
  // From reels_from (data/schedule.json) every network gets the Reel: the same cards with music, the same text.
  const reel = usesReel(story.data.date);
  const reelUrl = absoluteUrl(`/images/derived/${n}-reel.mp4`);
  const out: Outcome[] = [];

  const done = opts.skipDone ? socialDone(story.data.number) : new Set<Network>();
  for (const network of networks) {
    if (done.has(network)) {
      out.push({ network, status: 'skipped', detail: 'already posted or scheduled (data/sent.json)' });
      continue;
    }
    try {
      if (opts.dryRun) {
        const urls = reel ? (network === 'threads' ? [...cardUrls, reelUrl] : [reelUrl]) : network === 'facebook' ? [heroUrl] : cardUrls; // Instagram and Threads share the carousel cards
        for (const u of urls) await waitForUrl(u, 1, 0); // in a dry run, still prove every picture is live
        const text = network === 'facebook' ? posts.facebook : network === 'instagram' ? posts.instagram : posts.threads;
        const over = network === 'instagram' && text.length > INSTAGRAM_LIMIT ? `; TOO LONG for Instagram by ${text.length - INSTAGRAM_LIMIT}` : '';
        out.push({ network, status: 'dry-run', detail: `${configured[network] ? 'credentials present' : 'no credentials yet'}; pictures reachable: ${urls.length}; text ${text.length} characters${over}` });
        console.log(`\n[${network}] dry run\n${urls.map((u) => `  image: ${u}`).join('\n')}\n---\n${text}\n---${network === 'threads' && posts.threadsReply ? `\n(reply) ${posts.threadsReply}` : ''}`);
        continue;
      }
      if (!configured[network]) {
        out.push({ network, status: 'skipped', detail: 'credentials not set' });
        continue;
      }
      if ((opts.draft || opts.scheduleAt) && network !== 'facebook') {
        out.push({ network, status: 'skipped', detail: 'Instagram and Threads have no draft feature in their APIs; only Facebook can be saved as a draft or scheduled' });
        continue;
      }
      if (reel) {
        if (opts.draft) throw new Error('a Reel cannot be saved as a Facebook draft through the API; nothing was posted (use a dry run to preview)');
        await waitForUrl(reelUrl);
        if (network === 'facebook') {
          // A Reel Meta accepted but did not confirm is still recorded (marked UNCONFIRMED), so it is never uploaded twice;
          // npm run verify flags it until "Reels" with action confirm has checked it with Meta.
          let id: string;
          let note = '';
          try {
            id = await postFacebookReel({ videoUrl: reelUrl, description: posts.facebook, scheduleAt: opts.scheduleAt });
          } catch (e) {
            if (!(e instanceof UnconfirmedReel)) throw e;
            id = e.videoId;
            note = ` UNCONFIRMED: ${e.message.slice(0, 160)}`;
          }
          // A quiz Reel must not open on the answer: its Facebook cover is the mystery card (Instagram uses the first frame).
          // The tag goes before any UNCONFIRMED note, which "Reels confirm" later cuts off with everything after it.
          let cover = '';
          if (story.data.format === 'quiz') {
            try {
              await setFacebookReelCover(id, cardUrls[0]);
              cover = ' (cover: mystery card)';
            } catch (e) {
              cover = ` (cover not set: ${(e as Error).message.slice(0, 120).replace(/[()]/g, '')})`;
            }
          }
          const hash = await liveReelHash(story.data.number);
          out.push({ network, status: opts.scheduleAt ? 'drafted' : 'posted', detail: `${opts.scheduleAt ? `scheduled for ${opts.scheduleAt.toISOString()}` : 'posted'} reel ${id} ${musicTag(story.data.number)}${cover}${note}`, ...(hash ? { reel: hash } : {}) });
        } else if (network === 'instagram') {
          if (posts.instagram.length > INSTAGRAM_LIMIT) throw new Error(`text is ${posts.instagram.length - INSTAGRAM_LIMIT} characters over Instagram's ${INSTAGRAM_LIMIT} limit; tighten the story, nothing was posted`);
          out.push({ network, status: 'posted', detail: `reel media ${await postInstagramReel({ videoUrl: reelUrl, caption: posts.instagram })}` });
        } else {
          // Threads: the cards with the teaser and a topic tag, the Reel in a reply (owner, 27 Oct 2026).
          for (const u of cardUrls) await waitForUrl(u);
          const t = await postThreads({ text: posts.threads, imageUrls: cardUrls, topicTag: threadsTopic(), reply: posts.threadsReply, replyVideoUrl: reelUrl });
          // The post is live even if the reply failed: record it (posted), so no later run posts it again.
          out.push({ network, status: 'posted', detail: `thread ${t.id} (cards, ${t.replyError ? `Reel reply FAILED: ${t.replyError.replace(/[()]/g, '')}` : 'Reel in reply'}${threadsTopic() ? `, topic ${threadsTopic()}` : ''})` });
        }
      } else if (network === 'facebook') {
        await waitForUrl(heroUrl);
        const id = await postFacebookPhoto({ imageUrl: heroUrl, message: posts.facebook, draft: opts.draft, scheduleAt: opts.scheduleAt });
        out.push({ network, status: opts.scheduleAt ? 'drafted' : opts.draft ? 'drafted' : 'posted', detail: `${opts.scheduleAt ? `scheduled for ${opts.scheduleAt.toISOString()}` : opts.draft ? 'draft' : 'post'} ${id} (short id ${id.split('_')[1] ?? id})` });
      } else if (network === 'instagram') {
        if (posts.instagram.length > INSTAGRAM_LIMIT) throw new Error(`text is ${posts.instagram.length - INSTAGRAM_LIMIT} characters over Instagram's ${INSTAGRAM_LIMIT} limit; tighten the story, nothing was posted`);
        for (const u of cardUrls) await waitForUrl(u);
        out.push({ network, status: 'posted', detail: `media ${await postInstagramCarousel({ imageUrls: cardUrls, caption: posts.instagram })}` });
      } else {
        for (const u of cardUrls) await waitForUrl(u);
        out.push({ network, status: 'posted', detail: `thread ${(await postThreads({ text: posts.threads, imageUrls: cardUrls })).id}` });
      }
    } catch (e) {
      out.push({ network, status: 'failed', detail: (e as Error).message });
    }
  }
  for (const o of out) console.log(`[${o.network}] ${o.status}: ${o.detail}`);
  return out;
}
