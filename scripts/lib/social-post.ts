import type { LoadedStory } from './stories';
import { socialPosts } from './social';
import { metaConfigured, postFacebookPhoto, postInstagramCarousel, postThreads, waitForUrl } from './meta';
import { absoluteUrl } from '../../src/lib/url';
import { pad3 } from '../../src/schema/story';

export type Network = 'facebook' | 'instagram' | 'threads';
export type Outcome = { network: Network; status: 'posted' | 'dry-run' | 'skipped' | 'failed'; detail: string };

const CARDS = 7;

/** Posts one story to the chosen networks. Never throws: each network reports its own outcome. */
export async function postStoryToSocials(
  story: LoadedStory,
  opts: { kind: 'scheduled' | 'archive'; webLive: boolean; dryRun: boolean; networks?: Network[] },
): Promise<Outcome[]> {
  const networks = opts.networks ?? ['facebook', 'instagram', 'threads'];
  const posts = socialPosts(story, opts);
  const configured = metaConfigured();
  const n = pad3(story.data.number);
  const heroUrl = absoluteUrl(story.data.hero.src);
  const cardUrls = Array.from({ length: CARDS }, (_, i) => absoluteUrl(`/images/derived/${n}-ig-${String(i + 1).padStart(2, '0')}.png`));
  const out: Outcome[] = [];

  for (const network of networks) {
    try {
      if (opts.dryRun) {
        const urls = network === 'facebook' ? [heroUrl] : network === 'instagram' ? cardUrls : [];
        for (const u of urls) await waitForUrl(u, 1, 0); // in a dry run, still prove every picture is live
        const text = network === 'facebook' ? posts.facebook : network === 'instagram' ? posts.instagram : posts.threads;
        out.push({ network, status: 'dry-run', detail: `${configured[network] ? 'credentials present' : 'no credentials yet'}; pictures reachable: ${urls.length}; text ${text.length} characters` });
        console.log(`\n[${network}] dry run\n${urls.map((u) => `  image: ${u}`).join('\n')}\n---\n${text}\n---${network === 'threads' ? `\n(reply) ${posts.threadsReply}` : ''}`);
        continue;
      }
      if (!configured[network]) {
        out.push({ network, status: 'skipped', detail: 'credentials not set' });
        continue;
      }
      if (network === 'facebook') {
        await waitForUrl(heroUrl);
        out.push({ network, status: 'posted', detail: `post ${await postFacebookPhoto({ imageUrl: heroUrl, message: posts.facebook })}` });
      } else if (network === 'instagram') {
        for (const u of cardUrls) await waitForUrl(u);
        out.push({ network, status: 'posted', detail: `media ${await postInstagramCarousel({ imageUrls: cardUrls, caption: posts.instagram })}` });
      } else {
        out.push({ network, status: 'posted', detail: `thread ${await postThreads({ text: posts.threads, reply: posts.threadsReply })}` });
      }
    } catch (e) {
      out.push({ network, status: 'failed', detail: (e as Error).message });
    }
  }
  for (const o of out) console.log(`[${o.network}] ${o.status}: ${o.detail}`);
  return out;
}
