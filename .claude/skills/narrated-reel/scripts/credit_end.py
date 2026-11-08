#!/usr/bin/env python3
# RETIRED 8 Nov 2026: the owner ordered no credits on the Reel. Do not run. Credits go in the story's reelCredits (shown on its web page).
"""Writes the photo credits small on a Reel's ending card, so they travel with the video (Instagram's caption has no room).
   python credit_end.py final.mp4 "Paintings after Commons photos by ..."   keeps final-before-credit.mp4, replaces final.mp4.
   Audio is copied untouched; the video is re-encoded once at high quality; the AI tag is written again."""
import os, subprocess, sys, textwrap
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reel_engine import W, H

src, text = sys.argv[1], sys.argv[2]
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]))
start = dur - 3.9
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 28)
lines = textwrap.wrap(text, 62)
ov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
y = 1430  # inside the card, clear of the question above and of Instagram's buttons and caption below
for line in lines:
    d.text((W / 2 - d.textlength(line, font=font) / 2, y), line, font=font, fill=(205, 205, 205, 255))
    y += 34
png = src + '.credit.png'
ov.save(png)
before = os.path.join(os.path.dirname(src) or '.', 'final-before-credit.mp4')
if not os.path.exists(before):  # run again, and it starts from the same clean file
    os.replace(src, before)
subprocess.run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', before, '-i', png, '-filter_complex',
                f"[0:v][1:v]overlay=enable='gte(t,{start:.2f})',format=yuv420p[v]", '-map', '[v]', '-map', '0:a',
                '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-c:a', 'copy', '-movflags', '+faststart', src], check=True)
ex = subprocess.check_output('find ~/Developer/football-stories-101/node_modules -type f -name exiftool -perm +111 | head -1', shell=True, text=True).strip()
subprocess.run([ex, '-overwrite_original', '-q', '-XMP-iptcExt:DigitalSourceType=http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia', src], check=True)
os.remove(png)
print(src, 'credit added from', round(start, 2), 's')
