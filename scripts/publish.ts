/**
 * The daily publish run (spec 7.1), executed by .github/workflows/publish-daily.yml
 * after the site has been built and deployed.
 *
 *   select  -> the story whose `date` fell in the last 24 hours and is not yet in data/sent.json
 *   send    -> the newsletter provider (Buttondown by default)
 *   post    -> Telegram channel: hero image, headline, dek, link
 *   write   -> social/NNN.md (Facebook, Instagram, Threads captions) + card copies
 *   record  -> data/sent.json so a re-run never double-sends
 *   fallback-> no story due: archive story with the nearest anniversary, "From the archive"
 *
 * Environment:
 *   BUTTONDOWN_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID   secrets
 *   WEB_LAG_DAYS (default 7), SITE_URL, SITE_BASE               variables
 *   DRY_RUN=1                 log instead of sending, record nothing
 *   PUBLISH_NOW=<ISO date>    pretend it is another time (testing)
 *   PUBLISH_STORY_NUMBER=<n>  force a specific story (manual run)
 *   ALLOW_ARCHIVE_FALLBACK=0  disable the archive fallback
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadStories, ROOT, PUBLIC_DIR, heroFile, type LoadedStory } from './lib/stories';
import { selectProvider } from './lib/providers';
import { emailSubject, emailMarkdown, webLiveDate } from './lib/email';
import { socialMarkdown, socialFilename, telegramCaption } from './lib/social';
import { sendTelegramPhoto, telegramConfigured } from './lib/telegram';
import { postStoryToSocials, recordSocial, type Outcome } from './lib/social-post';
import { metaConfigured } from './lib/meta';
import { pad3, storyNumber } from '../src/schema/story';
import { isoDate } from '../src/lib/format';

interface SentRecord {
  key: string;
  number: number;
  slug: string;
  kind: 'scheduled' | 'archive';
  sentAt: string;
  provider: string;
  providerId: string | null;
  telegram: boolean;
  social?: Record<string, string>;
  subject: string;
}
interface SentFile {
  sent: SentRecord[];
  social?: unknown[]; // written by recordSocial(); kept as is
}

const SENT_PATH = path.join(ROOT, 'data/sent.json');
const DUE_WINDOW_MS = 24 * 60 * 60 * 1000;
// Meta refuses Facebook schedule times much more than four weeks ahead (30 Nov failed on 19 Oct at 29.3 days).
const FACEBOOK_WINDOW_MS = 27 * DUE_WINDOW_MS;

const now = process.env.PUBLISH_NOW ? new Date(process.env.PUBLISH_NOW) : new Date();
if (Number.isNaN(now.getTime())) throw new Error(`PUBLISH_NOW is not a valid date: ${process.env.PUBLISH_NOW}`);

function readSent(): SentFile {
  try {
    const parsed = JSON.parse(fs.readFileSync(SENT_PATH, 'utf8')) as SentFile;
    return { ...parsed, sent: Array.isArray(parsed.sent) ? parsed.sent : [] };
  } catch {
    return { sent: [] };
  }
}

function writeSent(file: SentFile) {
  fs.mkdirSync(path.dirname(SENT_PATH), { recursive: true });
  // Keep the social records as they are on disk now (recordSocial may have added some since this file was read).
  const onDisk = fs.existsSync(SENT_PATH) ? (JSON.parse(fs.readFileSync(SENT_PATH, 'utf8')) as SentFile) : { sent: [] };
  fs.writeFileSync(SENT_PATH, JSON.stringify({ ...file, social: onDisk.social ?? file.social }, null, 2) + '\n');
}

/** Distance in days between a story's month/day and today's, ignoring the year. */
function anniversaryDistance(date: Date, today: Date): number {
  const y = today.getUTCFullYear();
  const candidates = [y - 1, y, y + 1].map((yy) => Date.UTC(yy, date.getUTCMonth(), date.getUTCDate()));
  const t = Date.UTC(y, today.getUTCMonth(), today.getUTCDate());
  return Math.min(...candidates.map((c) => Math.abs(c - t))) / 86_400_000;
}

function pickDue(stories: LoadedStory[], sent: SentFile): LoadedStory | null {
  const sentNumbers = new Set(sent.sent.filter((r) => r.kind === 'scheduled').map((r) => r.number));
  const forced = process.env.PUBLISH_STORY_NUMBER?.trim();
  if (forced) {
    const n = Number.parseInt(forced, 10);
    const s = stories.find((x) => x.data.number === n);
    if (!s) throw new Error(`PUBLISH_STORY_NUMBER=${forced} does not match any story`);
    if (sentNumbers.has(n) && process.env.FORCE_RESEND !== '1') {
      console.log(`${storyNumber(n)} has already been sent; set FORCE_RESEND=1 to send it again.`);
      return null;
    }
    return s;
  }
  // A story counts as handled once it is on every network that has keys (the email may still be in dry-run
  // mode). If one network failed, the next try posts only that one (postStoryToSocials skips the rest).
  // Without this, Monday's run would re-pick Sunday's 10:00 story, which is only 22 hours earlier.
  const configured = metaConfigured();
  const needed = (['facebook', 'instagram', 'threads'] as const).filter((n) => configured[n]);
  const records = (sent.social ?? []) as { number: number; network: string }[];
  const posted = new Set(
    stories.map((s) => s.data.number).filter((n) => needed.length > 0 && needed.every((net) => records.some((r) => r.number === n && r.network === net))),
  );
  const due = stories
    .filter((s) => !s.data.draft)
    .filter((s) => !posted.has(s.data.number))
    .filter((s) => s.data.date.getTime() <= now.getTime() && s.data.date.getTime() > now.getTime() - DUE_WINDOW_MS)
    .filter((s) => !sentNumbers.has(s.data.number))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime()); // newest first: today's story beats a retry
  return due[0] ?? null;
}

function pickArchive(stories: LoadedStory[], sent: SentFile): LoadedStory | null {
  const resends = new Map<number, number>();
  for (const r of sent.sent) if (r.kind === 'archive') resends.set(r.number, (resends.get(r.number) ?? 0) + 1);
  const todayKeyPrefix = `archive:`;
  const sentToday = new Set(sent.sent.filter((r) => r.key.startsWith(todayKeyPrefix) && r.key.endsWith(isoDate(now))).map((r) => r.number));
  const pool = stories
    .filter((s) => !s.data.draft && s.data.date.getTime() <= now.getTime() - DUE_WINDOW_MS)
    .filter((s) => !sentToday.has(s.data.number));
  if (pool.length === 0) return null;
  pool.sort(
    (a, b) =>
      anniversaryDistance(a.data.date, now) - anniversaryDistance(b.data.date, now) ||
      (resends.get(a.data.number) ?? 0) - (resends.get(b.data.number) ?? 0) ||
      a.data.date.getTime() - b.data.date.getTime(),
  );
  return pool[0];
}

function cardFiles(story: LoadedStory): string[] {
  const n = pad3(story.data.number);
  const dir = path.join(PUBLIC_DIR, 'images/derived');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(`${n}-ig-`) && f.endsWith('.png'))
    .sort()
    .map((f) => path.join(dir, f));
}

async function main() {
  const { stories, errors } = loadStories();
  if (errors.length) {
    for (const e of errors) console.error(`error: ${e}`);
    process.exit(1);
  }
  const sent = readSent();
  const { provider, dryRun } = selectProvider();
  // Dry runs write their files to an ignored folder so a rehearsal (or a
  // morning without secrets) never commits anything back to the repository.
  const SOCIAL_DIR = path.join(ROOT, dryRun ? 'social/dry-run' : 'social');

  let story = pickDue(stories, sent);
  let kind: 'scheduled' | 'archive' = 'scheduled';
  if (!story) {
    if (process.env.ALLOW_ARCHIVE_FALLBACK === '0') {
      console.log('No story due in the last 24 hours and the archive fallback is disabled. Nothing to do.');
      return;
    }
    story = pickArchive(stories, sent);
    kind = 'archive';
    if (!story) {
      console.log('No story due and nothing in the archive to fall back on. Nothing to do.');
      return;
    }
    console.log(`No story due. Falling back to the archive: ${storyNumber(story.data.number)} (${story.data.slug}).`);
  } else {
    console.log(`Due: ${storyNumber(story.data.number)} (${story.data.slug}), dated ${story.data.date.toISOString()}.`);
  }

  const key = kind === 'scheduled' ? String(story.data.number) : `archive:${story.data.number}:${isoDate(now)}`;
  if (sent.sent.some((r) => r.key === key) && process.env.FORCE_RESEND !== '1') {
    console.log(`Already sent (${key}). Nothing to do.`);
    return;
  }

  const webLive = webLiveDate(story).getTime() <= now.getTime();
  const ctx = { kind, now };

  // 1. Email
  const subject = emailSubject(story, ctx);
  const markdown = emailMarkdown(story, ctx);
  fs.mkdirSync(SOCIAL_DIR, { recursive: true });
  fs.writeFileSync(path.join(SOCIAL_DIR, `${pad3(story.data.number)}-email.md`), `Subject: ${subject}\n\n${markdown}\n`);
  const result = await provider.send({ subject, markdown, reference: `story-${pad3(story.data.number)}${kind === 'archive' ? `-archive-${isoDate(now)}` : ''}` });
  console.log(`[${provider.name}] ${result.note ?? 'sent'}${result.id ? ` (id ${result.id})` : ''}`);

  // 2. Telegram
  let telegramOk = false;
  let telegramError: Error | null = null;
  const caption = telegramCaption(story, { webLive, kind });
  if (dryRun || !telegramConfigured()) {
    console.log(`[telegram] ${dryRun ? 'dry run' : 'not configured'}; caption would be:\n${caption}\n`);
  } else {
    try {
      const r = await sendTelegramPhoto({ photoPath: heroFile(story), caption });
      telegramOk = true;
      console.log(`[telegram] posted${r.messageId ? ` (message ${r.messageId})` : ''}`);
    } catch (e) {
      telegramError = e as Error;
      console.error(`[telegram] failed: ${telegramError.message}`);
    }
  }

  // 2b. Facebook, Instagram and Threads (each is skipped until its credentials are set)
  let socialOutcomes: Outcome[] = [];
  if (kind === 'scheduled') {
    // Social posting does not depend on the email service: it is a dry run only when DRY_RUN=1 is asked for.
    const socialDry = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
    socialOutcomes = await postStoryToSocials(story, { kind, webLive, dryRun: socialDry, skipDone: true });
    if (!socialDry) recordSocial(story.data.number, socialOutcomes);
    // Keep Facebook's Planner filled: schedule each upcoming story once it is inside Meta's scheduling window.
    for (const next of stories.filter((s) => !s.data.draft && s.data.date.getTime() > now.getTime() + 20 * 60e3 && s.data.date.getTime() < now.getTime() + FACEBOOK_WINDOW_MS)) {
      const ahead = await postStoryToSocials(next, { kind, webLive: false, dryRun: socialDry, networks: ['facebook'], scheduleAt: next.data.date, skipDone: true });
      if (!socialDry) recordSocial(next.data.number, ahead);
      if (ahead.some((o) => o.status === 'failed' || o.detail.includes('UNCONFIRMED'))) process.exitCode = 1; // a refused or unconfirmed schedule turns the run red too
    }
  } else {
    console.log('[social] archive re-run: not posted automatically to Facebook, Instagram or Threads.');
  }

  // 3. Social assets
  const cards = cardFiles(story);
  const cardsOut = path.join(SOCIAL_DIR, 'cards');
  fs.mkdirSync(cardsOut, { recursive: true });
  const cardPaths: string[] = [];
  for (const c of cards) {
    const dest = path.join(cardsOut, path.basename(c));
    fs.copyFileSync(c, dest);
    cardPaths.push(path.relative(ROOT, dest));
  }
  if (cards.length === 0) console.warn('[social] no Instagram cards found; run `npm run images` before publishing');
  const socialPath = path.join(SOCIAL_DIR, path.basename(socialFilename(story)));
  fs.writeFileSync(socialPath, socialMarkdown(story, { kind, now, webLive, cardPaths }));
  console.log(`[social] wrote ${path.relative(ROOT, socialPath)} and ${cardPaths.length} card(s)`);

  // 4. Record
  if (dryRun) {
    console.log('[record] dry run: data/sent.json left unchanged.');
  } else {
    sent.sent.push({
      key,
      number: story.data.number,
      slug: story.data.slug,
      kind,
      sentAt: now.toISOString(),
      provider: provider.name,
      providerId: result.id,
      telegram: telegramOk,
      social: Object.fromEntries(socialOutcomes.map((o) => [o.network, o.status])),
      subject,
    });
    writeSent(sent);
    console.log(`[record] ${key} added to data/sent.json`);
  }

  if (socialOutcomes.some((o) => o.status === 'failed' || o.detail.includes('UNCONFIRMED'))) process.exitCode = 1;
  if (telegramError) {
    // The email went out and is recorded; surface the Telegram failure as a red run.
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
