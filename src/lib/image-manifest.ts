import fs from 'node:fs';
import path from 'node:path';

export interface ManifestEntry {
  src: string;
  width: number;
  height: number;
  widths: number[];
  cards: string[]; // Instagram carousel card paths, site-relative
  og: string;
  /** Content hash of the inputs, used by scripts/images.ts to skip work. */
  hash?: string;
}
export type Manifest = Record<string, ManifestEntry>;

let cache: Manifest | null = null;

/** Reads the manifest written by scripts/images.ts. Empty when it has not run (e.g. first `astro dev`). */
export function readManifest(): Manifest {
  if (cache) return cache;
  const file = path.resolve(process.cwd(), 'public/images/derived/manifest.json');
  try {
    cache = JSON.parse(fs.readFileSync(file, 'utf8')) as Manifest;
  } catch {
    cache = {};
  }
  return cache;
}
