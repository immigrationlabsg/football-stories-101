/**
 * The daily Reel (owner's choice on 24 Oct 2026, "style B"): the 7 carousel cards, each slowly zooming in and
 * fading into the next, on a blurred copy of the card filling the 9:16 frame, with a public-domain music track.
 * 1080x1920, 30 fps, H.264 + AAC, about 23 seconds: inside what Instagram, Facebook and Threads accept for Reels.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { ROOT } from './stories';

const run = promisify(execFile);
export const MUSIC_DIR = path.join(ROOT, 'assets/music');
/** Public-domain tracks (assets/music/CREDITS.md); a story uses TRACKS[number % length]. Owner's choice on 24 Oct 2026:
 * Beethoven's Coriolan Overture on every Reel for now (the other clips stay in assets/music, unused). */
export const TRACKS = ['coriolan.m4a'];
export const trackFor = (number: number) => path.join(MUSIC_DIR, TRACKS[number % TRACKS.length]);
/** The short music name written into each Facebook Reel record, e.g. "(music: coriolan)". */
export const musicTag = (number: number) => `(music: ${path.basename(trackFor(number), '.m4a')})`;
/** What the Reels scheduled on 24 Oct 2026 carried before that choice (a 4-track rotation, no tag in the record). */
export const legacyMusicTag = (number: number) => `(music: ${['egmont', 'coriolan', 'mozart40', 'hebrides'][number % 4]})`;

/** Stories dated on or after this get a Reel instead of the picture posts (data/schedule.json reels_from). */
export function reelsFrom(): Date | null {
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/schedule.json'), 'utf8')).reels_from;
  return s ? new Date(`${s}T00:00:00+08:00`) : null;
}
export const usesReel = (date: Date) => {
  const from = reelsFrom();
  return Boolean(from && date.getTime() >= from.getTime());
};

const FIRST = 3; // seconds on the cover card
const EACH = 4; // seconds on every other card
const FADE = 0.6;
const FPS = 30;

export async function renderReel(cardFiles: string[], track: string, out: string): Promise<void> {
  if (!ffmpegPath) throw new Error('ffmpeg is not available on this machine');
  const durs = cardFiles.map((_, i) => (i === 0 ? FIRST : EACH));
  const total = durs.reduce((a, b) => a + b, 0) - FADE * (durs.length - 1);
  const parts: string[] = [];
  cardFiles.forEach((_, i) => {
    const d = durs[i];
    parts.push(
      `[${i}:v]split[x${i}][y${i}]`,
      `[x${i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.15,fps=${FPS}[bg${i}]`,
      `[y${i}]scale=1620:2025,zoompan=z='1+0.06*on/(${d}*${FPS})':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${d * FPS}:s=1080x1350:fps=${FPS}[c${i}]`,
      `[bg${i}][c${i}]overlay=0:285:shortest=1,format=yuv420p,setsar=1[v${i}]`,
    );
  });
  let prev = '[v0]';
  let at = 0;
  for (let i = 1; i < cardFiles.length; i++) {
    at += durs[i - 1] - FADE;
    parts.push(`${prev}[v${i}]xfade=transition=fade:duration=${FADE}:offset=${at.toFixed(2)}[t${i}]`);
    prev = `[t${i}]`;
  }
  const a = cardFiles.length;
  parts.push(`[${a}:a]atrim=0:${total.toFixed(2)},afade=t=in:d=0.5,afade=t=out:st=${(total - 1.5).toFixed(2)}:d=1.5[aout]`);
  const inputs = cardFiles.flatMap((f, i) => ['-loop', '1', '-t', String(durs[i]), '-i', f]);
  const tmp = `${out}.tmp.mp4`;
  await run(
    ffmpegPath,
    ['-v', 'error', '-y', ...inputs, '-i', track, '-filter_complex', parts.join(';'), '-map', prev, '-map', '[aout]',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-t', total.toFixed(2), '-movflags', '+faststart', tmp],
    { maxBuffer: 1 << 24 },
  );
  fs.renameSync(tmp, out);
}
