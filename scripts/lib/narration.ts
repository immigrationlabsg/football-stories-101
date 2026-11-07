/**
 * Narrated card Reels (owner, 8 Nov 2026): every Reel carries a voice and one of two music tracks. The voice reads the
 * cards' own fact-checked words, so no new claim enters; each spoken line lives in assets/narration/NNN/lines.json with
 * its clip beside it (0.mp3, 1.mp3, ...), one per card, in card order. Made by `npm run narration` and a Claude session
 * (docs/scheduled-tasks.md task 8), and mixed here at build time, so no large video goes into the repository.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';
import { exiftool } from 'exiftool-vendored';
import { ROOT } from './stories';
import { AI_SOURCE_TYPE, MUSIC_DIR } from './reel';

const run = promisify(execFile);
export const NARRATION_DIR = path.join(ROOT, 'assets/narration');
/** Music per track: where the track's own ending lands, and how far the bed sits below full level under the voice (dB). */
export const MIX: Record<string, { endAt: number; underVoice: number }> = {
  'sports-documentary.m4a': { endAt: 62.5, underVoice: -12 },
  'cinematic-trailer.m4a': { endAt: 65, underVoice: -13.3 },
};
const END_CARD_LIFT = 10.5; // dB, once the voice has finished
const FPS = 30;
const FADE = 0.6;
const LEAD = 0.25; // seconds on a card before its line starts
const TAIL = 0.65; // seconds after a line, of which FADE crosses into the next card
const CLOSE_HOLD = 4; // the closing card stays at least this long (standard for every Reel)
/** The voice cleanup the owner chose by ear on cut E/F. */
const VOICE_FILTER = 'equalizer=f=2000:t=o:w=1.5:g=-5,acompressor=threshold=-22dB:ratio=2.5:attack=5:release=90:makeup=2';

export type NarrationLine = { card: number; text: string };
export type Narration = { voice: string; lines: NarrationLine[] };
const dirFor = (n: string) => path.join(NARRATION_DIR, n);

/** Reels dated on or after this must be narrated (data/schedule.json narration_from). */
export function narrationFrom(): Date | null {
  const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/schedule.json'), 'utf8')).narration_from;
  return s ? new Date(`${s}T00:00:00+08:00`) : null;
}
export const needsNarration = (date: Date) => {
  const from = narrationFrom();
  return Boolean(from && date.getTime() >= from.getTime());
};
/** The finished narration of a story: every line has its clip, or null. */
export function narrationFor(n: string): { narration: Narration; clips: string[] } | null {
  const file = path.join(dirFor(n), 'lines.json');
  if (!fs.existsSync(file)) return null;
  const narration = JSON.parse(fs.readFileSync(file, 'utf8')) as Narration;
  const clips = narration.lines.map((_, i) => path.join(dirFor(n), `${i}.mp3`));
  return clips.every((c) => fs.existsSync(c)) ? { narration, clips } : null;
}

async function seconds(file: string): Promise<number> {
  const { stderr } = await run(ffmpegPath!, ['-hide_banner', '-i', file, '-f', 'null', '-'], { maxBuffer: 1 << 24 });
  const all = [...stderr.matchAll(/time=(\d+):(\d+):([\d.]+)/g)].at(-1);
  if (!all) throw new Error(`no duration for ${file}`);
  return Number(all[1]) * 3600 + Number(all[2]) * 60 + Number(all[3]);
}

/** The cards with their voice over them, each held as long as its line, with the track's own ending under the closing card. */
export async function renderNarratedReel(cardFiles: string[], clips: string[], lines: NarrationLine[], track: string, out: string): Promise<number> {
  if (!ffmpegPath) throw new Error('ffmpeg is not available on this machine');
  const mix = MIX[path.basename(track)];
  if (!mix) throw new Error(`no mix settings for ${track}`);
  const said = new Map<number, number>();
  const lengths = await Promise.all(clips.map(seconds));
  lines.forEach((l, i) => said.set(l.card, i));
  if (said.size !== cardFiles.length) throw new Error(`${cardFiles.length} cards but lines for ${said.size}`);
  const durs = cardFiles.map((_, c) => {
    const len = lengths[said.get(c)!];
    if (c === cardFiles.length - 1) return Math.ceil(Math.max(CLOSE_HOLD, LEAD + len + 1.6) * FPS) / FPS;
    return Math.ceil((LEAD + len + TAIL) * FPS) / FPS;
  });
  const starts: number[] = [];
  durs.reduce((at, d, i) => ((starts[i] = at), at + d - FADE), 0);
  const total = starts.at(-1)! + durs.at(-1)!;
  const voiceEnd = starts.at(-1)! + LEAD + lengths[said.get(cardFiles.length - 1)!];
  if (total > mix.endAt) throw new Error(`Reel of ${total.toFixed(1)} s is longer than the music (${mix.endAt} s): shorten the spoken lines`);
  const inputs = cardFiles.flatMap((f, i) => ['-loop', '1', '-t', durs[i].toFixed(3), '-i', f]);
  clips.forEach((c) => inputs.push('-i', c));
  inputs.push('-i', track);
  const parts: string[] = [];
  cardFiles.forEach((_, i) => {
    const frames = Math.round(durs[i] * FPS);
    parts.push(
      `[${i}:v]split[x${i}][y${i}]`,
      `[x${i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.15,fps=${FPS}[bg${i}]`,
      `[y${i}]scale=1620:2025,zoompan=z='1+0.06*on/${frames}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${frames}:s=1080x1350:fps=${FPS}[c${i}]`,
      `[bg${i}][c${i}]overlay=0:285:shortest=1,format=yuv420p,setsar=1[v${i}]`,
    );
  });
  let prev = '[v0]';
  for (let i = 1; i < cardFiles.length; i++) {
    parts.push(`${prev}[v${i}]xfade=transition=fade:duration=${FADE}:offset=${starts[i].toFixed(3)}[t${i}]`);
    prev = `[t${i}]`;
  }
  const k = cardFiles.length;
  clips.forEach((_, i) => {
    const ms = Math.round((starts[lines[i].card] + (lines[i].card === 0 ? 0.08 : LEAD)) * 1000);
    // 20 ms fade over each clip's end, so its hard stop cannot tick
    parts.push(`[${k + i}:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=out:st=${Math.max(0, lengths[i] - 0.02).toFixed(3)}:d=0.02,${VOICE_FILTER},adelay=${ms}|${ms}[l${i}]`);
  });
  parts.push(`${clips.map((_, i) => `[l${i}]`).join('')}amix=inputs=${clips.length}:normalize=0,apad,atrim=0:${total.toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[voice]`);
  const fromSec = mix.endAt - total;
  const up = `min(1,max(0,(t-${voiceEnd.toFixed(3)})/0.9))`;
  parts.push(`[${k + clips.length}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=${fromSec.toFixed(3)}:${mix.endAt},asetpts=PTS-STARTPTS,volume='pow(10,(${mix.underVoice}+${END_CARD_LIFT}*${up})/20)':eval=frame,afade=t=in:d=0.25,afade=t=out:st=${(total - 0.4).toFixed(3)}:d=0.4[bed]`);
  parts.push(`[voice][bed]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.84:attack=5:release=80:level=disabled[aout]`);
  const tmp = `${out}.tmp.mp4`;
  await run(
    ffmpegPath,
    ['-v', 'error', '-y', ...inputs, '-filter_complex', parts.join(';'), '-map', prev, '-map', '[aout]',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', '-t', total.toFixed(3), '-movflags', '+faststart', tmp],
    { maxBuffer: 1 << 24 },
  );
  await exiftool.write(tmp, { 'XMP-iptcExt:DigitalSourceType': AI_SOURCE_TYPE } as never, ['-overwrite_original']);
  fs.renameSync(tmp, out);
  return total;
}
