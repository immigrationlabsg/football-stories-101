import fs from 'node:fs';
import path from 'node:path';

export interface TelegramPost {
  photoPath: string; // local file
  caption: string; // HTML, max 1024 chars
}

export function telegramConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN?.trim() && env.TELEGRAM_CHAT_ID?.trim());
}

/** Posts a photo with caption to the channel. https://core.telegram.org/bots/api#sendphoto */
export async function sendTelegramPhoto(post: TelegramPost, env: NodeJS.ProcessEnv = process.env): Promise<{ messageId: number | null }> {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set');

  const form = new FormData();
  form.set('chat_id', chatId);
  form.set('caption', post.caption.length > 1024 ? post.caption.slice(0, 1020) + '…' : post.caption);
  form.set('parse_mode', 'HTML');
  const bytes = fs.readFileSync(post.photoPath);
  form.set('photo', new Blob([bytes], { type: 'image/jpeg' }), path.basename(post.photoPath));

  const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string; result?: { message_id?: number } };
  if (!res.ok || !json.ok) throw new Error(`Telegram responded ${res.status}: ${json.description ?? 'unknown error'}`);
  return { messageId: json.result?.message_id ?? null };
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
