/**
 * TikTok through Zernio (workflow "TikTok"). The key is the ZERNIO_API_KEY repo secret; it is never printed.
 *
 *   MODE=accounts npm run tiktok                 read only: connected accounts and TikTok creator info
 *   MODE=post STORY=21 npm run tiktok            dry run: show the caption and video, post nothing
 *   MODE=post STORY=21 DRY_RUN=0 npm run tiktok  post that story's Reel to TikTok, public, with the AI label
 *
 * Each post is recorded in data/tiktok.json, which stops a second post of the same story.
 * The caption is the Instagram caption (it ends with "Illustrations made with AI." and has no website link).
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadStories, ROOT } from './lib/stories';
import { socialPosts } from './lib/social';
import { absoluteUrl } from '../src/lib/url';
import { pad3 } from '../src/schema/story';

const API = 'https://zernio.com/api/v1';
// The saved value may carry extra text around the key (e.g. a copied "ZERNIO_API_KEY=..." line): use the key itself.
const RAW = process.env.ZERNIO_API_KEY?.trim();
const KEY = RAW?.match(/sk_[0-9a-f]{64}/)?.[0] ?? RAW;
const MODE = process.env.MODE ?? 'accounts';
const dryRun = process.env.DRY_RUN !== '0';
const PLATFORM = process.env.PLATFORM === 'youtube' ? 'youtube' : 'tiktok';
const LABEL = PLATFORM === 'youtube' ? 'YouTube' : 'TikTok';
const RECORD = path.join(ROOT, PLATFORM === 'youtube' ? 'data/youtube.json' : 'data/tiktok.json');

type Rec = { number: number; story: string; at: string; postId: string; status: string; url?: string | null };

async function api(method: string, route: string, body?: unknown): Promise<any> {
  if (!KEY) throw new Error('ZERNIO_API_KEY is not set (repo secret).');
  // Shape only, never the key: Zernio keys are "sk_" plus 64 hex characters (67 in all).
  if (!/^sk_[0-9a-f]{64}$/.test(KEY)) throw new Error(`ZERNIO_API_KEY does not look like a Zernio key (length ${KEY.length}, starts with "sk_": ${KEY.startsWith('sk_')}, contains "sk_": ${KEY.includes('sk_')}). Copy the key again and re-save it.`);
  const r = await fetch(`${API}${route}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  if (!r.ok && r.status !== 207) throw new Error(`${method} ${route} -> ${r.status}: ${JSON.stringify(json).slice(0, 800)}`);
  return { status: r.status, ...json };
}

async function tiktokAccounts(): Promise<any[]> {
  const res = await api('GET', '/accounts?limit=50');
  const list: any[] = res.accounts ?? res.data ?? [];
  return list;
}

function records(): Rec[] {
  try {
    return JSON.parse(fs.readFileSync(RECORD, 'utf8')).posts ?? [];
  } catch {
    return [];
  }
}

if (MODE === 'accounts') {
  const list = await tiktokAccounts();
  if (!list.length) console.log('No connected accounts.');
  for (const a of list) {
    console.log(`${a.platform}: @${a.username ?? a.displayName ?? '?'} id=${a._id ?? a.id} active=${a.isActive ?? '?'}`);
    if (a.platform === 'tiktok') {
      const info = await api('GET', `/accounts/${a._id ?? a.id}/tiktok/creator-info?mediaType=video`);
      const { status: _s, ...rest } = info;
      console.log(`  creator info: ${JSON.stringify(rest).slice(0, 1500)}`);
    }
  }
} else if (MODE === 'post') {
  const number = Number(process.env.STORY);
  if (!Number.isInteger(number) || number <= 0) throw new Error('STORY must be a story number, e.g. 21.');
  const story = loadStories().stories.find((s) => s.data.number === number);
  if (!story) throw new Error(`No story ${number}.`);
  if (story.data.draft) throw new Error(`Story ${number} is a draft.`);
  if (records().some((r) => r.number === number)) {
    console.log(`Story ${number} is already on ${LABEL} (${path.basename(RECORD)}). Nothing posted.`);
    process.exit(0);
  }
  const caption = socialPosts(story, { kind: 'scheduled', webLive: false }).instagram;
  // Owner rule: no website link in social posts.
  if (/https?:\/\/|github\.io|www\./i.test(caption)) throw new Error('The caption contains a link; nothing posted.');
  if (!caption.includes('Illustrations made with AI.')) throw new Error('The caption lacks the AI line; nothing posted.');
  if (caption.length > 2200) throw new Error(`The caption is ${caption.length} characters (TikTok allows 2,200).`);
  const videoUrl = absoluteUrl(`/images/derived/${pad3(number)}-reel.mp4`);
  const head = await fetch(videoUrl, { method: 'HEAD' });
  if (!head.ok) throw new Error(`The Reel is not on the site (${head.status}): ${videoUrl}`);

  const accounts = (await tiktokAccounts()).filter((a) => a.platform === PLATFORM);
  if (accounts.length !== 1) throw new Error(`Expected exactly 1 connected ${LABEL} account, found ${accounts.length}.`);
  const accountId = accounts[0]._id ?? accounts[0].id;
  // YouTube Short: title is the story's question (the Reel's ending question), as on the hand-uploaded Shorts.
  const title = (story.data.question ?? story.data.hook ?? story.data.title).slice(0, 100);
  const ytBody = {
    content: caption,
    mediaItems: [{ type: 'video', url: videoUrl }],
    platforms: [{ platform: 'youtube', accountId, platformSpecificData: { title, visibility: 'public', madeForKids: false, containsSyntheticMedia: true, categoryId: '17' } }],
    publishNow: true,
  };
  const info: any = PLATFORM === 'youtube' ? {} : await api('GET', `/accounts/${accountId}/tiktok/creator-info?mediaType=video`);
  const levels: string[] = (info.privacyLevels ?? []).map((l: any) => (typeof l === 'string' ? l : l.value));
  if (levels.length && !levels.includes('PUBLIC_TO_EVERYONE')) throw new Error(`Public posting not allowed for this account: ${levels.join(', ')}`);

  const body = PLATFORM === 'youtube' ? ytBody : {
    content: caption,
    mediaItems: [{ type: 'video', url: videoUrl }],
    platforms: [{ platform: 'tiktok', accountId }],
    tiktokSettings: {
      privacy_level: 'PUBLIC_TO_EVERYONE',
      allow_comment: true,
      allow_duet: false,
      allow_stitch: false,
      video_made_with_ai: true, // TikTok's "AI-generated content" label: the paintings are made with AI
      video_cover_timestamp_ms: 300, // the first frame shows the world-known event
      content_preview_confirmed: true,
      express_consent_given: true,
    },
    publishNow: true,
  };
  console.log(`Story ${number} -> ${LABEL}${PLATFORM === 'youtube' ? ` "${title}"` : ''} @${accounts[0].username ?? '?'}\nVideo: ${videoUrl}\nCaption (${caption.length} chars):\n${caption}\n`);
  if (dryRun) {
    console.log('Dry run: nothing posted.');
    process.exit(0);
  }
  const res = await api('POST', '/posts', body);
  const post = res.post ?? {};
  const p = (post.platforms ?? [])[0] ?? {};
  console.log(`Zernio: post ${post._id} status ${post.status}; ${LABEL} status ${p.status}${p.errorMessage ? `; error: ${p.errorMessage}` : ''}`);
  if (post._id && post.status !== 'failed') {
    const file = fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, 'utf8')) : { posts: [] };
    file.posts.push({ number, story: story.data.slug, at: new Date().toISOString(), postId: post._id, status: post.status, url: p.platformPostUrl ?? null } satisfies Rec);
    fs.writeFileSync(RECORD, JSON.stringify(file, null, 2) + '\n');
  } else {
    process.exitCode = 1;
  }
} else if (MODE === 'status') {
  for (const r of records()) {
    const res = await api('GET', `/posts/${r.postId}`);
    const p = (res.post?.platforms ?? [])[0] ?? {};
    console.log(`${r.number}: ${res.post?.status} ${p.platformPostUrl ?? ''} ${p.errorMessage ?? ''}`);
  }
} else {
  throw new Error(`Unknown MODE ${MODE} (accounts, post or status).`);
}
