import sharp from 'sharp';
import fs from 'node:fs';
const dir = '/home/user/football-stories-101/public/images/stories/';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpg')).sort();
const T = 360, cols = 4, rows = Math.ceil(files.length / cols);
const comps = [];
for (const [i, f] of files.entries()) {
  const img = await sharp(dir + f).resize(T, T).toBuffer();
  const label = Buffer.from(`<svg width="${T}" height="30"><rect width="${T}" height="30" fill="black" opacity="0.6"/><text x="8" y="21" font-size="18" fill="white" font-family="sans-serif">${f}</text></svg>`);
  comps.push({ input: img, left: (i % cols) * T, top: Math.floor(i / cols) * T }, { input: label, left: (i % cols) * T, top: Math.floor(i / cols) * T });
}
await sharp({ create: { width: cols * T, height: rows * T, channels: 3, background: '#fff' } }).composite(comps).jpeg().toFile(process.argv[2]);
