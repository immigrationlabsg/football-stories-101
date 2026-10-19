import type { LoadedStory } from './stories';
import { INSTAGRAM_LIMIT, socialPosts } from './social';
import { metaConfigured, postFacebookPhoto, postInstagramCarousel, postThreads, waitForUrl } from './meta';
import { absoluteUrl } from '../../src/lib/url';
import { pad3 } from '../../src/schema/story';

export type Network = 'facebook' | 'instagram' | 'threads';
export type Outcome = { network: Network; status: 'posted' | 'drafted' | 'dry-run' | 'skipped' | 'failed'; detail: string };


/** Posts one story to the chosen networks. Never throws: each network reports its own outcome. */
export async function postStoryToSocials(
  story: LoadedStory,
  opts: { kind: 'scheduled' | 'archive'; webLive: boolean; dryRun: boolean; networks?: Network[]; draft?: boolean; scheduleAt?: Date },
): Promise<Outcome[]> {
  const networks = opts.networks ?? ['facebook', 'instagram', 'threads'];
  const posts = socialPosts(story, opts);
  const configured = metaConfigured();
  const n = pad3(story.data.number);
  const heroUrl = absoluteUrl(`/images/derived/${n}-fb.png`); // the headline card for Facebook
  // The Instagram carousel: the cover, one card per fact, and the closing card.
  const cardUrls = Array.from({ length: story.data.facts.length + 2 }, (_, i) => absoluteUrl(`/images/derived/${n}-ig-${String(i + 1).padStart(2, '0')}.png`));
  const out: Outcome[] = [];

  for (const network of networks) {
    try {
      if (opts.dryRun) {
        const urls = network === 'facebook' ? [heroUrl] : network === 'instagram' ? cardUrls : [];
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
      if (network === 'facebook') {
        await waitForUrl(heroUrl);
        const id = await postFacebookPhoto({ imageUrl: heroUrl, message: posts.facebook, draft: opts.draft, scheduleAt: opts.scheduleAt });
        out.push({ network, status: opts.scheduleAt ? 'drafted' : opts.draft ? 'drafted' : 'posted', detail: `${opts.scheduleAt ? `scheduled for ${opts.scheduleAt.toISOString()}` : opts.draft ? 'draft' : 'post'} ${id} (short id ${id.split('_')[1] ?? id})` });
      } else if (network === 'instagram') {
        if (posts.instagram.length > INSTAGRAM_LIMIT) throw new Error(`text is ${posts.instagram.length - INSTAGRAM_LIMIT} characters over Instagram's ${INSTAGRAM_LIMIT} limit; tighten the story, nothing was posted`);
        for (const u of cardUrls) await waitForUrl(u);
        out.push({ network, status: 'posted', detail: `media ${await postInstagramCarousel({ imageUrls: cardUrls, caption: posts.instagram })}` });
      } else {
        out.push({ network, status: 'posted', detail: `thread ${await postThreads({ text: posts.threads, reply: posts.threadsReply || undefined })}` });
      }
    } catch (e) {
      out.push({ network, status: 'failed', detail: (e as Error).message });
    }
  }
  for (const o of out) console.log(`[${o.network}] ${o.status}: ${o.detail}`);
  return out;
}
