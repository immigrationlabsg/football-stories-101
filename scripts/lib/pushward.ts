/**
 * PushWard helpers for the iPhone Dynamic Island board (today's Reel numbers on IG, TikTok, YouTube and Threads).
 *   buildBoard(input)   -> a validated "board" content object (4 tiles), every string cut safely to PushWard's limits
 *   shouldPush(input)   -> whether this run should send an update, and whether it must restart the Live Activity
 *   pushBoard(input)    -> create the activity (idempotent) and PATCH it; never puts the key in an error
 * Limits come from PushWard's OpenAPI spec (https://api.pushward.app/openapi.json): JSON Schema maxLength, which counts
 * characters (code points). To be safe the cut also keeps the UTF-16 length inside the limit, and never splits an
 * emoji or other grapheme.
 * Free plan: 250 Live Activity updates a month (429 quota.exceeded after that). Apple ends a Live Activity after 8 h.
 */

export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'threads';
export const PLATFORMS: readonly Platform[] = ['instagram', 'tiktok', 'youtube', 'threads'];

export type PlatformStats = {
  views?: number | null;
  likes?: number | null;
  shares?: number | null;
  comments?: number | null;
  followers?: number | null;
};

export type Trend = 'up' | 'down' | 'flat';
export type TapAction = { url: string; foreground?: boolean };
export type BoardTile = { label: string; value: string; unit?: string; icon?: string; color?: string; trend?: Trend; url_action?: TapAction };
export type BoardContent = {
  template: 'board';
  state: string;
  subtitle?: string;
  icon: string;
  accent_color: string;
  compact_label: string;
  compact_trailing_label: string;
  tiles: BoardTile[];
  /** Whole-card tap target (the board has no primary button, so no top-level url_action). */
  tap_action?: TapAction;
};

export const LIMITS = {
  state: 256,
  subtitle: 256,
  icon: 128,
  compact_label: 4,
  compact_trailing_label: 4,
  tile_label: 32,
  tile_value: 16,
  tile_unit: 8,
  url: 2048,
  tiles_min: 1,
  tiles_max: 4,
} as const;

const NAMES: Record<Platform, string> = { instagram: 'IG', tiktok: 'TikTok', youtube: 'YouTube', threads: 'Threads' };
const ICONS: Record<Platform, string> = { instagram: 'camera', tiktok: 'music.note', youtube: 'play.rectangle.fill', threads: 'at' };
const COLORS: Record<Platform, string> = { instagram: '#E1306C', tiktok: '#25F4EE', youtube: '#FF0000', threads: '#A0A0A0' };
const DASH = '–';

// ---------------------------------------------------------------- text helpers

/** Characters as JSON Schema counts them (code points). */
export const charCount = (s: string): number => Array.from(s).length;

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;
const graphemes = (s: string): string[] => (segmenter ? Array.from(segmenter.segment(s), (x) => x.segment) : Array.from(s));
const fits = (s: string, max: number) => charCount(s) <= max && s.length <= max;

/**
 * Trim and cut `s` so it fits `max` characters (code points and UTF-16 units both), on grapheme boundaries only, so an
 * emoji, flag or accented letter is never split. Adds "…" when something was cut and there is room for it.
 */
export function truncate(s: string, max: number, ellipsis = true): string {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  if (max <= 0) return '';
  if (fits(t, max)) return t;
  const room = ellipsis && max >= 2 ? max - 1 : max;
  let out = '';
  for (const g of graphemes(t)) {
    if (!fits(out + g, room)) break;
    out += g;
  }
  out = out.trimEnd();
  return ellipsis && max >= 2 ? out + '…' : out;
}

/** 950 -> "950", 1234 -> "1.2k", 15321 -> "15k", 1_100_000 -> "1.1m". Always 4 characters or fewer for real numbers. */
export function shortNum(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  const n = Math.max(0, Math.round(v));
  if (n < 1000) return String(n);
  const scales: [number, string][] = [
    [1e3, 'k'],
    [1e6, 'm'],
    [1e9, 'b'],
  ];
  for (const [scale, unit] of scales) {
    const x = n / scale;
    const one = Math.round(x * 10) / 10;
    if (one < 10) return `${one % 1 === 0 ? one.toFixed(0) : one.toFixed(1)}${unit}`;
    const whole = Math.round(x);
    if (whole < 1000) return `${whole}${unit}`;
  }
  return '999b'; // beyond any real count; keeps the 4-character ear valid
}

// ---------------------------------------------------------------- board

export type BoardInput = {
  /** The Reel's name, shown as the board header (e.g. "Lyon"). */
  name: string;
  /** Today's numbers per platform; a missing platform shows dashes. */
  stats: Partial<Record<Platform, PlatformStats | null | undefined>>;
  /** Views at the previous update, for the trend arrow; missing means no arrow. */
  previousViews?: Partial<Record<Platform, number | null | undefined>>;
  /** Tap target for the board and every tile (the phone dashboard). */
  url?: string;
  subtitle?: string;
  icon?: string;
  accentColor?: string;
  compactLabel?: string;
};

export function trendOf(now: number | null | undefined, before: number | null | undefined): Trend | undefined {
  if (now == null || before == null || !Number.isFinite(now) || !Number.isFinite(before)) return undefined;
  return now > before ? 'up' : now < before ? 'down' : 'flat';
}

/** Tile label: "IG ♥1.2k ↗45 👤3.4k" (likes, shares, followers), cut to 32 characters. */
export function tileLabel(p: Platform, s: PlatformStats | null | undefined): string {
  const full = `${NAMES[p]} ♥${shortNum(s?.likes)} ↗${shortNum(s?.shares)} 👤${shortNum(s?.followers)}`;
  return truncate(full, LIMITS.tile_label);
}

export function buildBoard(input: BoardInput): BoardContent {
  const url = input.url && charCount(input.url) <= LIMITS.url && /^https?:\/\//.test(input.url) ? input.url : undefined;
  const tileTap = url ? { url_action: { url, foreground: true } } : {};
  const cardTap = url ? { tap_action: { url, foreground: true } } : {};
  let total = 0;
  let anyViews = false;
  const tiles: BoardTile[] = PLATFORMS.map((p) => {
    const s = input.stats?.[p] ?? null;
    const views = s?.views ?? null;
    if (views != null && Number.isFinite(views)) {
      total += Math.max(0, views);
      anyViews = true;
    }
    const trend = trendOf(views, input.previousViews?.[p]);
    return {
      label: tileLabel(p, s),
      value: truncate(shortNum(views), LIMITS.tile_value, false) || DASH,
      unit: truncate('views', LIMITS.tile_unit, false),
      icon: ICONS[p],
      color: COLORS[p],
      ...(trend ? { trend } : {}),
      ...tileTap,
    };
  });
  const content: BoardContent = {
    template: 'board',
    state: truncate(input.name, LIMITS.state) || 'Football Stories 101',
    ...(input.subtitle?.trim() ? { subtitle: truncate(input.subtitle, LIMITS.subtitle) } : {}),
    icon: truncate(input.icon ?? 'soccerball', LIMITS.icon, false),
    accent_color: input.accentColor ?? 'green',
    compact_label: truncate(input.compactLabel ?? 'FS', LIMITS.compact_label, false) || 'FS',
    compact_trailing_label: truncate(anyViews ? shortNum(total) : DASH, LIMITS.compact_trailing_label, false) || DASH,
    tiles,
    ...cardTap,
  };
  const errors = validateBoard(content);
  if (errors.length) throw new Error(`buildBoard produced an invalid board: ${errors.join('; ')}`);
  return content;
}

/** Checks a board against PushWard's schema limits; returns a list of problems (empty = valid). */
export function validateBoard(c: BoardContent): string[] {
  const e: string[] = [];
  const len = (name: string, v: string | undefined, max: number, min = 0) => {
    if (v == null) return min > 0 ? void e.push(`${name} missing`) : undefined;
    if (typeof v !== 'string') return void e.push(`${name} not a string`);
    if (charCount(v) < min) e.push(`${name} empty`);
    if (!fits(v, max)) e.push(`${name} longer than ${max}`);
    if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(v)) e.push(`${name} has a broken character`);
  };
  if (c.template !== 'board') e.push('template must be board');
  len('state', c.state, LIMITS.state);
  len('subtitle', c.subtitle, LIMITS.subtitle);
  len('icon', c.icon, LIMITS.icon);
  len('compact_label', c.compact_label, LIMITS.compact_label);
  len('compact_trailing_label', c.compact_trailing_label, LIMITS.compact_trailing_label);
  if (c.compact_label != null && c.compact_label !== c.compact_label.trim()) e.push('compact_label not trimmed');
  if (c.compact_trailing_label != null && c.compact_trailing_label !== c.compact_trailing_label.trim()) e.push('compact_trailing_label not trimmed');
  len('tap_action.url', c.tap_action?.url, LIMITS.url);
  if ('url_action' in (c as object)) e.push('board must not have a top-level url_action (use tap_action)');
  if (!Array.isArray(c.tiles) || c.tiles.length < LIMITS.tiles_min || c.tiles.length > LIMITS.tiles_max) e.push('tiles must be 1-4');
  (c.tiles ?? []).forEach((t, i) => {
    len(`tiles[${i}].label`, t.label, LIMITS.tile_label, 1);
    len(`tiles[${i}].value`, t.value, LIMITS.tile_value, 1);
    len(`tiles[${i}].unit`, t.unit, LIMITS.tile_unit);
    len(`tiles[${i}].icon`, t.icon, LIMITS.icon);
    len(`tiles[${i}].url_action.url`, t.url_action?.url, LIMITS.url);
    if (t.trend != null && !['up', 'down', 'flat'].includes(t.trend)) e.push(`tiles[${i}].trend invalid`);
  });
  return e;
}

// ---------------------------------------------------------------- schedule

const MIN = 60e3;
const HOUR = 60 * MIN;
const SGT_OFFSET = 8 * HOUR;
export const SCHEDULE = {
  windowStartHourSgt: 8, // 08:00-23:59 Singapore
  freeMonthCap: 245, // under the free plan's 250, with a safety margin
  quotaMargin: 5, // never go closer than this to PushWard's reported limit
  freeSlotsMin: [0, 15, 30, 60, 120, 180, 300, 420], // after the Reel posts: when the numbers move
  freeDailyMax: 10, // hard ceiling per day on the free plan
  paidEveryMin: 5,
  paidToleranceMs: 30e3, // cron jitter: 4 m 30 s counts as 5 minutes
  // stale_ttl: longer than the biggest gap between free-plan slots in a day (2 h), shorter than the night, so the card
  // ends itself in the evening and the next morning's update is one clean push-to-start.
  staleTtlSec: 6 * 3600,
  // PushWard renews the card past Apple's 8 h limit while updates continue, for about 3 days. Past this, start afresh.
  maxRunMs: 71 * HOUR,
  priority: 9,
} as const;

export type ActivityState = 'ongoing' | 'ended' | 'preempted' | null;

export type ShouldPushInput = {
  now: Date | string | number;
  /** When today's Reel posted (any network); null when unknown. */
  postedAt: Date | string | number | null | undefined;
  /** ISO times of past updates (one per accepted PATCH). Used for the daily budget and slot timing. */
  lastPushes: string[];
  plan: 'free' | 'paid';
  /** A new Reel is today's story since the last update. */
  storyChanged: boolean;
  /** Live Activity updates used this month: live_activity_updates_used from GET /auth/me (getQuota), or your own count. */
  quotaUsedThisMonth: number;
  /** live_activity_updates_limit from GET /auth/me; omit when unknown or uncapped. */
  quotaLimit?: number | null;
  /** true when quotaUsedThisMonth came from GET /auth/me: then it is trusted as is, not raised by the local log. */
  quotaFromApi?: boolean;
  force?: boolean;
  /** state from GET /activities/{slug} (getActivity); null/omitted when unknown. */
  activityState?: ActivityState;
  /** When the current run of the Live Activity started (save `now` whenever a push had restart=true). */
  lastStart?: string | null;
};

export type ShouldPushResult = {
  push: boolean;
  reason: string;
  /**
   * This update starts the Live Activity again: it is ended on the server (stale overnight, or ended), or it has run
   * about 3 days and needs a fresh start. Pass it to pushBoard. Save now as lastStart when the push succeeds.
   */
  restart: boolean;
};

const toMs = (v: Date | string | number | null | undefined): number | null => {
  if (v == null || v === '') return null;
  const t = v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(v);
  return Number.isFinite(t) ? t : null;
};
const sgtDay = (ms: number) => Math.floor((ms + SGT_OFFSET) / (24 * HOUR));
const sgtHour = (ms: number) => new Date(ms + SGT_OFFSET).getUTCHours();

/** The month cap actually used: 245, or PushWard's reported limit minus a margin when that is lower. */
export function monthCap(limit?: number | null): number {
  return limit != null && Number.isFinite(limit) && limit > 0 ? Math.min(SCHEDULE.freeMonthCap, limit - SCHEDULE.quotaMargin) : SCHEDULE.freeMonthCap;
}

export function shouldPush(input: ShouldPushInput): ShouldPushResult {
  const now = toMs(input.now) ?? Date.now();
  const pushes = (input.lastPushes ?? [])
    .map((x) => toMs(x))
    .filter((x): x is number => x != null && x <= now)
    .sort((a, b) => a - b);
  const lastPush = pushes.length ? pushes[pushes.length - 1] : null;
  const start = toMs(input.lastStart);
  // Ended on the server: reported so, or no update for longer than stale_ttl (the server has auto-ended it).
  const ended =
    input.activityState === 'ended' || input.activityState === 'preempted' || (input.activityState == null && (lastPush == null || now - lastPush >= SCHEDULE.staleTtlSec * 1000));
  const restart = ended || (start != null && now - start >= SCHEDULE.maxRunMs);
  const inWindow = sgtHour(now) >= SCHEDULE.windowStartHourSgt;
  const no = (reason: string): ShouldPushResult => ({ push: false, reason, restart: false });
  const yes = (reason: string): ShouldPushResult => ({ push: true, reason, restart });

  if (input.plan === 'paid') {
    if (input.force) return yes('forced');
    if (!inWindow) return no('outside 08:00-23:59 Singapore');
    if (input.storyChanged) return yes('new Reel');
    const gap = SCHEDULE.paidEveryMin * MIN - SCHEDULE.paidToleranceMs;
    if (lastPush == null || now - lastPush >= gap) return yes('every 5 minutes');
    return no(`last update ${Math.round((now - lastPush) / 1000)} s ago`);
  }

  // ---- free plan: month budget first (calendar month, UTC, as PushWard counts it)
  const d = new Date(now);
  const monthStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  const daysAfterToday = daysInMonth - d.getUTCDate();
  const given = Number.isFinite(input.quotaUsedThisMonth) ? Math.max(0, input.quotaUsedThisMonth) : 0;
  const loggedThisMonth = pushes.filter((t) => t >= monthStart).length;
  const used = input.quotaFromApi ? given : Math.max(given, loggedThisMonth);
  const cap = monthCap(input.quotaLimit);
  const remaining = cap - used;
  if (remaining < 1) return no(`monthly cap reached (${used}/${cap})`);

  if (input.force) return yes('forced');
  if (!inWindow) return no('outside 08:00-23:59 Singapore');
  // The new Reel always gets its first update (only the month cap stops it).
  if (input.storyChanged) return yes('new Reel');

  const today = sgtDay(now);
  const todayCount = pushes.filter((t) => sgtDay(t) === today).length;
  const allowance = Math.min(SCHEDULE.freeDailyMax, Math.ceil((remaining + todayCount) / (daysAfterToday + 1)));
  const posted = toMs(input.postedAt);
  if (posted == null) return no('no Reel time known');
  const elapsed = now - posted;
  if (elapsed < 0) return no('Reel not posted yet');
  if (elapsed >= 24 * HOUR) return no('Reel older than a day');
  const due = [...SCHEDULE.freeSlotsMin].reverse().find((m) => m * MIN <= elapsed)!; // slot 0 always matches
  const label = due === 0 ? 'Reel posted' : `+${due >= 60 ? `${due / 60}h` : `${due}m`} after posting`;
  if (lastPush != null && lastPush >= posted + due * MIN) return no('no update slot due');
  if (todayCount + 1 > allowance) return no(`${label}: daily budget used (${todayCount}/${allowance})`);
  return yes(label);
}

// ---------------------------------------------------------------- network

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string>; headers?: { get: (k: string) => string | null } }>;

type CallResult =
  | { ok: true; status: number; json: any }
  | { ok: false; status: number; quotaExceeded: boolean; rateLimited: boolean; retryAfterMs?: number; error: string };

const KEY_RE = /^hlk_[A-Za-z0-9_-]+$/;
const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const BASE = 'https://api.pushward.app';

/** Removes the exact key and anything key-looking from a message. */
export function redact(msg: string, key?: string): string {
  let m = String(msg ?? '');
  if (key) m = m.split(key).join('[redacted]');
  return m.replace(/hlk_[A-Za-z0-9_-]+/g, 'hlk_[redacted]').replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
}

type Conn = { key: string | undefined; fetchImpl?: FetchLike; baseUrl?: string; timeoutMs?: number };

async function call(conn: Conn, step: string, method: string, path: string, body?: unknown, contentType = 'application/json'): Promise<CallResult> {
  const key = conn.key?.trim() ?? '';
  const timeoutMs = conn.timeoutMs ?? 20_000;
  const doFetch: FetchLike = conn.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const base = (conn.baseUrl ?? BASE).replace(/\/+$/, '');
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = contentType;
  try {
    const r = await doFetch(`${base}${path}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(timeoutMs) });
    const text = await r.text().catch(() => '');
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON */
    }
    if (r.ok) return { ok: true, status: r.status, json };
    const code = typeof json?.code === 'string' ? json.code : '';
    const quotaExceeded = r.status === 429 && code === 'quota.exceeded';
    const rateLimited = r.status === 429 && code === 'rate_limit.exceeded';
    const retryHeader = Number(r.headers?.get?.('Retry-After'));
    const retryAfterMs = typeof json?.retry_after_ms === 'number' ? json.retry_after_ms : Number.isFinite(retryHeader) && retryHeader > 0 ? retryHeader * 1000 : undefined;
    const extra = quotaExceeded && json?.used != null ? ` (${json.used}/${json.limit ?? '?'} used, resets ${json.reset_at ?? '?'})` : '';
    const what = code || json?.detail ? [code, json?.detail].filter(Boolean).join(' ') : text.slice(0, 200);
    return { ok: false, status: r.status, quotaExceeded, rateLimited, retryAfterMs, error: redact(`${step} failed: HTTP ${r.status}${what ? ` ${what}` : ''}${extra}`, key).slice(0, 300) };
  } catch (e) {
    const err = e as Error;
    const timedOut = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    const error = timedOut ? `${step} timed out after ${Math.round(timeoutMs / 1000)} s` : `${step} network error: ${String(err?.message ?? err).slice(0, 200)}`;
    return { ok: false, status: 0, quotaExceeded: false, rateLimited: false, error: redact(error, key) };
  }
}

export type QuotaResult = { ok: boolean; status: number; used: number | null; limit: number | null; resetsAt: string | null; periodMonth: number | null; error: string | null };

/** Live usage from GET /auth/me (live_activity_updates_used / _limit; limit is null when uncapped). */
export async function getQuota(conn: Conn): Promise<QuotaResult> {
  if (!KEY_RE.test(conn.key?.trim() ?? '')) return { ok: false, status: 0, used: null, limit: null, resetsAt: null, periodMonth: null, error: 'PushWard key missing or not in the hlk_ format' };
  const r = await call(conn, 'quota', 'GET', '/auth/me');
  if (!r.ok) return { ok: false, status: r.status, used: null, limit: null, resetsAt: null, periodMonth: null, error: r.error };
  const j = r.json ?? {};
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    ok: true,
    status: r.status,
    used: num(j.live_activity_updates_used),
    limit: num(j.live_activity_updates_limit),
    resetsAt: typeof j.quota_resets_at === 'string' ? j.quota_resets_at : null,
    periodMonth: num(j.quota_period_month),
    error: null,
  };
}

export type ActivityResult = { ok: boolean; status: number; exists: boolean; state: ActivityState; error: string | null };

/** GET /activities/{slug}: whether it exists and its state (ongoing / ended / preempted). */
export async function getActivity(conn: Conn & { slug: string }): Promise<ActivityResult> {
  if (!KEY_RE.test(conn.key?.trim() ?? '')) return { ok: false, status: 0, exists: false, state: null, error: 'PushWard key missing or not in the hlk_ format' };
  if (!SLUG_RE.test(conn.slug)) return { ok: false, status: 0, exists: false, state: null, error: 'invalid slug' };
  const r = await call(conn, 'read', 'GET', `/activities/${encodeURIComponent(conn.slug)}`);
  if (!r.ok) return r.status === 404 ? { ok: true, status: 404, exists: false, state: null, error: null } : { ok: false, status: r.status, exists: false, state: null, error: r.error };
  const s = String(r.json?.state ?? '').toLowerCase();
  return { ok: true, status: r.status, exists: true, state: s === 'ongoing' || s === 'ended' || s === 'preempted' ? s : null, error: null };
}

export type PushBoardInput = Conn & {
  slug: string;
  name: string;
  content: BoardContent;
  /**
   * shouldPush's restart. Normally the ongoing PATCH alone restarts an ended activity (push-to-start). When the
   * activity is still ongoing on the server after about 3 days, it is ended first so the new start is clean.
   */
  restart?: boolean;
  create?: { priority?: number; ended_ttl?: number; stale_ttl?: number; dismissal_ttl?: number };
};

export type PushBoardResult = {
  ok: boolean;
  status: number;
  quotaExceeded: boolean;
  rateLimited: boolean;
  error: string | null;
  /** Metered calls accepted (the create POST and every PATCH count against the monthly quota). */
  updates: number;
  retryAfterMs?: number;
};

/** GET (free), POST /activities only when missing, then PATCH /activities/{slug} with state ongoing and the board. One activity, kept running. */
export async function pushBoard(input: PushBoardInput): Promise<PushBoardResult> {
  const key = input.key?.trim() ?? '';
  const out = (r: Partial<PushBoardResult> & { ok: boolean; status: number }): PushBoardResult => ({
    quotaExceeded: false,
    rateLimited: false,
    updates: 0,
    ...r,
    error: r.error ? redact(r.error, key) : null,
  });
  if (!KEY_RE.test(key)) return out({ ok: false, status: 0, error: 'PushWard key missing or not in the hlk_ format' });
  if (!SLUG_RE.test(input.slug)) return out({ ok: false, status: 0, error: 'invalid slug' });
  const problems = validateBoard(input.content);
  if (problems.length) return out({ ok: false, status: 0, error: `invalid board: ${problems.join('; ')}` });
  const conn: Conn = { key, fetchImpl: input.fetchImpl, baseUrl: input.baseUrl, timeoutMs: input.timeoutMs };
  const c = input.create ?? {};
  const priority = c.priority ?? SCHEDULE.priority;
  const staleTtl = c.stale_ttl ?? SCHEDULE.staleTtlSec;
  const failed = (r: Extract<CallResult, { ok: false }>, updates = 0) =>
    out({ ok: false, status: r.status, quotaExceeded: r.quotaExceeded, rateLimited: r.rateLimited, retryAfterMs: r.retryAfterMs, error: r.error, updates });

  // The create call is metered like an update (docs: "a create and then the first update, and both count"), so look
  // first (GET is free) and create only when the activity does not exist yet.
  const path = `/activities/${encodeURIComponent(input.slug)}`;
  const merge = 'application/merge-patch+json';
  let updates = 0;
  const before = await getActivity({ ...conn, slug: input.slug });
  if (!before.ok) return out({ ok: false, status: before.status, error: before.error ?? 'could not read the activity' });
  if (!before.exists) {
    const created = await call(conn, 'create', 'POST', '/activities', {
      slug: input.slug,
      name: truncate(input.name, 256) || input.slug,
      priority,
      ended_ttl: c.ended_ttl ?? 7 * 24 * 3600,
      stale_ttl: staleTtl,
      dismissal_ttl: c.dismissal_ttl ?? 15 * 60,
    });
    if (!created.ok) return failed(created);
    updates++;
  }
  if (input.restart && before.exists && before.state === 'ongoing') {
    const ended = await call(conn, 'end', 'PATCH', path, { state: 'ended', dismissal_ttl: 0 }, merge);
    if (!ended.ok) return failed(ended, updates);
    updates++;
  }
  const r = await call(conn, 'update', 'PATCH', path, { state: 'ongoing', priority, stale_ttl: staleTtl, content: input.content }, merge);
  if (!r.ok) return failed(r, updates);
  return out({ ok: true, status: r.status, updates: updates + 1 });
}
