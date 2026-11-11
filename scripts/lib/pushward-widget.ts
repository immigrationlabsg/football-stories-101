/**
 * PushWard Home Screen widget: today's daily Reel views per platform (Instagram, TikTok, YouTube, Threads) and the total.
 * Companion to the Dynamic Island board in scripts/live-stats.ts. Pure helpers plus one network call; no key is ever
 * printed, stored or put in an error message.
 *
 * Built from the PushWard docs (read 11 Nov 2026):
 *   https://pushward.app/docs/widgets/api               POST /widgets (idempotent upsert, 201), PATCH /widgets/{slug}
 *   https://pushward.app/docs/widgets/templates/stat-list  stat_list: 1-6 rows of { label<=32, value<=32 (string), unit?<=16 }
 *   https://pushward.app/docs/limits                    Free plan: 50 widget updates / calendar month (UTC), then
 *                                                       429 code "quota.exceeded" with reset_at
 *   https://pushward.app/docs/api/authentication        Authorization: Bearer hlk_...; key needs widgets: write
 *
 * Budget (owner's free plan): at most WIDGET_MONTHLY_CAP (48) pushes per UTC month, leaving 2 spare of the 50. The Reel
 * switch always gets one (a slot is held back for every remaining day of the month); the extra evening refresh only runs
 * when the month's pace allows it. The docs don't say whether POST and PATCH count differently, so every push is counted.
 */

export const PUSHWARD_API = 'https://api.pushward.app';
export const WIDGET_SLUG = 'fs101-today';
export const WIDGET_NAME = 'FS101 today';
export const WIDGET_MONTHLY_CAP = 48; // free plan is 50/month (docs/limits); 2 kept spare
export const WIDGET_TIMEOUT_MS = 20_000;

// Field limits as published (docs/widgets/api "Content" table and docs/widgets/templates/stat-list).
export const LIMITS = {
  slug: 128,
  name: 256,
  label: 256,
  subtitle: 256,
  icon: 128,
  unit: 32,
  rowsMin: 1,
  rowsMax: 6,
  rowLabel: 32,
  rowValue: 32,
  rowUnit: 16,
  actionUrl: 2048, // Action object, docs/api/activities
  staleAfterMin: 60,
  staleAfterMax: 604_800,
} as const;

const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const KEY_RE = /^hlk_[A-Za-z0-9_-]+$/;

export type StatRow = { label: string; value: string; unit?: string };
export type WidgetAction = { url: string; foreground?: boolean };
export type WidgetContent = {
  template: 'stat_list';
  label?: string;
  subtitle?: string;
  icon?: string;
  accent_color?: string;
  stat_rows: StatRow[];
  tap_action?: WidgetAction;
};
/** Body for POST /widgets without the slug (pushWidget adds it). */
export type WidgetPayload = { name: string; content: WidgetContent; stale_after?: number };

type LivePost = { story: number | null; views: number | null };
type LiveNet = { posts?: LivePost[] } | undefined;
export type LiveJson = {
  today_story?: number | null;
  today_title?: string;
  read_at?: string;
  networks?: Partial<Record<'instagram' | 'tiktok' | 'youtube' | 'threads', LiveNet>>;
};

const NETWORKS = [
  ['instagram', 'Instagram'],
  ['tiktok', 'TikTok'],
  ['youtube', 'YouTube'],
  ['threads', 'Threads'],
] as const;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const fmt = (v: number | null) => (v == null || !Number.isFinite(v) ? '–' : Math.round(v).toLocaleString('en-US'));

function viewsOn(net: LiveNet, story: number | null): number | null {
  if (story == null) return null;
  const p = (net?.posts ?? []).find((x) => x.story === story);
  return typeof p?.views === 'number' && Number.isFinite(p.views) ? p.views : null;
}

/** Field-limit check against the published rules. Returns a list of problems (empty = valid). */
export function validateWidget(payload: WidgetPayload, slug?: string): string[] {
  const e: string[] = [];
  const len = (v: unknown, n: number, f: string) => {
    if (v != null && (typeof v !== 'string' || v.length > n)) e.push(`${f} must be a string of at most ${n} characters`);
  };
  if (slug !== undefined && (!SLUG_RE.test(slug) || slug.length > LIMITS.slug)) e.push('slug must be URL-safe (letters, digits, - and _, first a letter or digit), max 128');
  if (!payload?.name?.trim()) e.push('name is required');
  len(payload?.name, LIMITS.name, 'name');
  const c = payload?.content;
  if (!c || c.template !== 'stat_list') e.push('content.template must be "stat_list"');
  len(c?.label, LIMITS.label, 'content.label');
  len(c?.subtitle, LIMITS.subtitle, 'content.subtitle');
  len(c?.icon, LIMITS.icon, 'content.icon');
  const rows = c?.stat_rows;
  if (!Array.isArray(rows) || rows.length < LIMITS.rowsMin || rows.length > LIMITS.rowsMax) e.push('content.stat_rows must have 1 to 6 rows');
  for (const [i, r] of (Array.isArray(rows) ? rows : []).entries()) {
    if (typeof r?.label !== 'string' || !r.label.trim() || r.label.length > LIMITS.rowLabel) e.push(`stat_rows[${i}].label must be non-blank, max 32`);
    if (typeof r?.value !== 'string' || !r.value.trim() || r.value.length > LIMITS.rowValue) e.push(`stat_rows[${i}].value must be a non-blank string, max 32`);
    if (r?.unit != null && (typeof r.unit !== 'string' || r.unit.length > LIMITS.rowUnit)) e.push(`stat_rows[${i}].unit max 16`);
  }
  if (c?.tap_action) {
    const u = c.tap_action.url;
    if (typeof u !== 'string' || !u || u.length > LIMITS.actionUrl || /^javascript:/i.test(u)) e.push('content.tap_action.url must be a URL of at most 2048 characters');
  }
  const sa = payload?.stale_after;
  if (sa != null && (!Number.isInteger(sa) || sa < LIMITS.staleAfterMin || sa > LIMITS.staleAfterMax)) e.push('stale_after must be an integer from 60 to 604800');
  return e;
}

/**
 * live.json -> widget payload (stat_list template). Rows: Total first (it survives every placement: small shows 4 rows,
 * Lock Screen 3), then Instagram, TikTok, YouTube, Threads. Missing numbers show "–"; the total adds the known ones.
 * opts.dashboardUrl: tapping the widget opens it in Safari (foreground, as the docs require for http(s) to open a page).
 * opts.staleAfter: seconds until the Home Screen widget dims (docs mark stale_after "coming in app 1.6"); off by default.
 */
export function buildWidget(live: LiveJson, opts: { dashboardUrl?: string; staleAfter?: number; now?: Date } = {}): WidgetPayload {
  const story = typeof live?.today_story === 'number' ? live.today_story : null;
  const nets = live?.networks ?? {};
  const views = NETWORKS.map(([k, label]) => ({ label, v: viewsOn(nets[k], story) }));
  const known = views.filter((x) => x.v != null);
  const total = known.length ? known.reduce((t, x) => t + (x.v as number), 0) : null;
  const at = live?.read_at && !Number.isNaN(Date.parse(live.read_at)) ? new Date(live.read_at) : opts.now ?? new Date();
  const sgt = new Date(at.getTime() + 8 * 3600e3).toISOString().slice(11, 16);
  const title = (live?.today_title ?? '').trim();

  const content: WidgetContent = {
    template: 'stat_list',
    label: clip(story == null ? 'No Reel yet today' : title || `Story ${story}`, LIMITS.label),
    subtitle: clip(`${story == null ? 'Today' : `Story ${story}`} · views as of ${sgt} SGT`, LIMITS.subtitle),
    icon: 'soccerball',
    accent_color: 'green',
    stat_rows: [{ label: 'Total', value: fmt(total), unit: 'views' }, ...views.map((x) => ({ label: x.label, value: fmt(x.v) }))].map((r) => ({
      ...r,
      label: clip(r.label, LIMITS.rowLabel),
      value: clip(r.value, LIMITS.rowValue),
    })),
  };
  if (opts.dashboardUrl) content.tap_action = { url: opts.dashboardUrl, foreground: true };
  const payload: WidgetPayload = { name: WIDGET_NAME, content };
  if (opts.staleAfter != null) payload.stale_after = opts.staleAfter;
  const problems = validateWidget(payload);
  if (problems.length) throw new Error(`widget payload invalid: ${problems.join('; ')}`);
  return payload;
}

const monthKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`;

/**
 * Budget gate (UTC calendar month, matching PushWard's quota reset).
 *  - Never more than WIDGET_MONTHLY_CAP (48) a month.
 *  - Reel switch (storyChanged): always, while under the cap.
 *  - Otherwise one evening refresh (from refreshHourSgt, default 21:00 SGT, at least minGapHours after the last push),
 *    only if a slot is still held back for every remaining day's switch AND the month is not ahead of pace.
 * updatesThisMonth is reset to 0 automatically when lastUpdate falls in an earlier month.
 */
export function shouldUpdateWidget(a: {
  now: Date;
  storyChanged: boolean;
  updatesThisMonth: number;
  lastUpdate: string | Date | null | undefined;
  refreshHourSgt?: number;
  minGapHours?: number;
  cap?: number;
}): { update: boolean; reason: string; used: number } {
  const cap = a.cap ?? WIDGET_MONTHLY_CAP;
  const last = a.lastUpdate == null ? null : new Date(a.lastUpdate);
  const lastOk = last && !Number.isNaN(last.getTime()) ? last : null;
  const used = lastOk && monthKey(lastOk) === monthKey(a.now) ? Math.max(0, Math.floor(a.updatesThisMonth || 0)) : 0;
  if (used >= cap) return { update: false, reason: `monthly cap reached (${used}/${cap})`, used };
  if (a.storyChanged) return { update: true, reason: 'Reel switched', used };

  const sgtHour = new Date(a.now.getTime() + 8 * 3600e3).getUTCHours();
  if (sgtHour < (a.refreshHourSgt ?? 21)) return { update: false, reason: 'before the evening refresh hour', used };
  const gapH = lastOk ? (a.now.getTime() - lastOk.getTime()) / 3600e3 : Infinity;
  if (gapH < (a.minGapHours ?? 6)) return { update: false, reason: 'updated recently', used };

  const y = a.now.getUTCFullYear(), m = a.now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const today = a.now.getUTCDate();
  const daysAfterToday = daysInMonth - today;
  if (used + 1 + daysAfterToday > cap) return { update: false, reason: 'keeping slots for the coming Reel switches', used };
  const pace = Math.ceil((cap * today) / daysInMonth);
  if (used >= pace) return { update: false, reason: `ahead of pace (${used}/${pace} by today)`, used };
  return { update: true, reason: 'daily refresh', used };
}

export type PushResult = { ok: boolean; status: number; quotaExceeded: boolean; error?: string; action?: string; resetAt?: string };

/**
 * POST /widgets (idempotent upsert: creates the widget the first time, replaces name/content after) with a 20 s timeout.
 * Never throws; never puts the key in the result.
 */
export async function pushWidget(a: {
  key: string | undefined;
  slug?: string;
  payload: WidgetPayload;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<PushResult> {
  const key = a.key?.trim() ?? '';
  const slug = a.slug ?? WIDGET_SLUG;
  const scrub = (s: string) => (key ? s.split(key).join('hlk_***') : s).replace(/hlk_[A-Za-z0-9_-]+/g, 'hlk_***');
  if (!KEY_RE.test(key)) return { ok: false, status: 0, quotaExceeded: false, error: 'PUSHWARD_KEY missing or not an hlk_ key' };
  const problems = validateWidget(a.payload, slug);
  if (problems.length) return { ok: false, status: 0, quotaExceeded: false, error: `invalid payload: ${problems.join('; ')}` };
  const f = a.fetchImpl ?? fetch;
  try {
    const r = await f(`${PUSHWARD_API}/widgets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, ...a.payload }),
      signal: AbortSignal.timeout(a.timeoutMs ?? WIDGET_TIMEOUT_MS),
    });
    const text = await r.text().catch(() => '');
    let j: any = {};
    try {
      j = text ? JSON.parse(text) : {};
    } catch {
      /* not JSON */
    }
    if (r.ok) return { ok: true, status: r.status, quotaExceeded: false, action: r.headers?.get?.('X-Resource-Action') ?? undefined };
    const quotaExceeded = r.status === 429 && j?.code === 'quota.exceeded';
    const why = j?.code || j?.detail || j?.title ? [j.code, j.detail ?? j.title].filter(Boolean).join(': ') : text.slice(0, 200);
    return { ok: false, status: r.status, quotaExceeded, error: scrub(`PushWard ${r.status} ${why}`.trim()).slice(0, 300), resetAt: typeof j?.reset_at === 'string' ? j.reset_at : undefined };
  } catch (e) {
    const name = (e as Error)?.name;
    const msg = name === 'TimeoutError' || name === 'AbortError' ? `timed out after ${Math.round((a.timeoutMs ?? WIDGET_TIMEOUT_MS) / 1000)} s` : `network error: ${(e as Error)?.message ?? e}`;
    return { ok: false, status: 0, quotaExceeded: false, error: scrub(msg).slice(0, 300) };
  }
}
