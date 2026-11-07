---
name: narrated-reel
description: Makes a narrated Football Stories 101 Reel from start to finish, in the style the owner approved on the Maradona sample: a hook on a famous name, paintings from real photographs with camera moves, a voiceover, background music with no choppy volume changes, short captions and an end-card question. Use this whenever anyone asks for a new voiced, narrated or "Maradona-style" Reel or video for Football Stories 101, an extra post on football news (a result, a retirement, a record), or a remake of a story in the new format, and also when fixing the sound or pictures of such a Reel, even if they only say "make a video on Zidane" or "do one on Como". Not for the routine daily card Reels, which scripts/images.ts builds on its own.
---

# Narrated Reel

The owner's test: *would you send this to a friend?* They rejected the first sample because they did not know the player, the pictures did not make them visualise the moment, and they heard no music. They called the next one choppy until the music mix was fixed. Those four complaints are why this skill exists.

Before starting, read [references/standards.md](references/standards.md). It holds every limit and the reason for it. [references/lessons.md](references/lessons.md) lists what was tried and rejected, so read it before trying anything clever. [examples/maradona-reel.py](examples/maradona-reel.py) is the approved Reel as code, and the place to copy from.

Keep the owner's project rules in force throughout (repo `CLAUDE.md`, `docs/picture-guide.md`, `docs/editorial-standards.md`, the handoff). Nothing is posted without the owner's OK.

## Where things live

- Each reel gets a folder: `~/Developer/football-stories-samples/<slug>/`. It is outside the repo because of its size and outside Documents so scheduled tasks can read it. It holds `lines/`, `photos/`, `scenes/`, `music.mp3`, `reel.py`, `licences.json`, `PROVENANCE.md`, `build/`, `final.mp4`.
- Python: `~/Developer/football-stories-samples/.venv/bin/python -I` (numpy, pillow, faster-whisper). If it is missing: `python3 -m venv` there and `pip install numpy pillow faster-whisper`.
- Scripts: this skill's `scripts/` folder. `reel_engine.py` does the work, `check_reel.py` measures the result, `commons.py` finds photos and licences, `paint.sh` paints.

## Steps

### 1. Pick the story and write the script

**Finding the story (the owner's steps, 7 Nov 2026), in this order:**

1. What is the trending recent news in football?
2. Is there a rags-to-riches story in it, such as a low-division team reaching the top tier (Como: bankrupt in the fourth division in 2017, nine goals in the Champions League in 2026)?
3. What is the story of the key person behind the success? Take Cesc Fabregas: his route from youth player to manager, his story as a player, or how he started at Como and got to now.

These steps need not fit into one Reel. The owner: "you don't have to combine all into one topic necessarily. You could also break it down for more content over time." One news event can give several posts over time: the club's rise in one, the key person in another.

Keep to the story that serves that rise. On Como the owner cut a side fact, "It doesn't matter whether Essien's wife bought it. We only want to show their story of become rags to riches." A fact can be true and interesting and still not belong. Classic stories with a famous name (Maradona 1986) remain fine.

Write 6 to 8 short spoken lines, about 110 words and 40 to 45 seconds in all:

- **Line 0 is the whole hook**, and works with the sound off through its captions.
- The middle shows the moment step by step, so a viewer can picture it.
- A turn at about two thirds where the story has a real surprise. Say "But here's the part that surprised me" only if it did: Como's script does not use it.
- A short close that echoes the hook, then an end-card question that starts an argument. Never ask for a like, share, tag or follow.

Every claim needs a fact-check entry in `docs/fact-checks/`, two sources where they exist, and wording that stays inside what the sources say. Log disputed points and tell the owner. For news, confirm the result on UEFA, the league or a major outlet the same day, and date-stamp anything that may change ("fourth in the table" goes stale).

### 2. Find the pictures

Use `commons.py search` and `commons.py get`. Any named player's painting starts from a free Wikimedia Commons photo under PD, CC0, CC BY or CC BY-SA (`docs/picture-guide.md`). Never Getty, AP, Reuters or PA, even as a reference. A paid licence is the owner's decision only. Read each file's licence page, record it, and credit it in the post. Plan one picture per beat of the story; a drawn pitch map or timeline is the honest answer for anything no photograph shows. Do not invent a moment by painting it with no source photo, and no match footage, no other account's pictures.

Show nothing you have not looked at. If there is no good photo of the key moment, say so early and change the story or the angle rather than settling for a weak picture: weak pictures were the first rejection.

### 3. Paint

Write `scenes.txt` (`name|photo|what to paint`; the photo name uses underscores, as `commons.py get` saves it) and `kit.txt` (kit rules for this match; see `como-reel/kit.txt`), copy `~/Developer/football-stories-samples/maradona-reel/style.jpg` into the folder, then run `paint.sh` from the reel's folder. This style overrides the loose square style in the picture guide for these Reels only. Describe only what the photo shows: a line such as "a match in progress" makes the painter invent one. `paint.sh` needs a photo for every scene; a painting with no people and no photo (the Maradona pitch) needs a direct `codex exec` of its own. Look at each painting at full size against `standards.md`, and repaint any that fail. Keep a painting whole; do not cut out figures. If the image system refuses a scene, do not reword it to slip past. Pick another picture or make a local colour edit of an existing painting, and tell the owner.

### 4. Voice

`mcp__higgsfield__generate_audio` (or `generate_audio_batch`), one file per line, saved as `lines/0.mp3`, `1.mp3`...:
`model: text2speech_v2, variant: elevenlabs, voice_type: preset, voice_id: 30fc8796-ceb6-4a66-b3a7-4a145ef7f346`.
Spell out names and numbers as they should be said ("eleven"). Send them a few at a time: a batch of eight had one line refused for rate limits and that retry stayed queued for minutes.

### 5. Music

Default: `elevenlabs_music_v2_5`, `force_instrumental: true`, `duration` in seconds. Ask for a track at least as long as the Reel plus 8 s, so no repeat is needed. Find where its sound ends with `ffmpeg -i music.mp3 -af silencedetect=n=-40dB:d=0.5 -f null -`: that `silence_start` is your `end_src`, measured for each track.

The owner kept the music in this prompt, so start from it:

> Instrumental cinematic sports documentary score at 110 BPM with a strong pulse from the first second: driving taut drums and staccato strings, tense and exciting. It builds steadily, surges to a huge thrilling peak with pounding drums and bold brass in the middle, drops to a tense single piano and low strings, then rises to a triumphant, emotional finish with a clean final hit. Loud and energetic throughout, no vocals, no silence at the start.

Reuse the same track on later Reels only if the owner wants a signature sound; never a commercial song.

### 6. Build

Copy `examples/maradona-reel.py` to the folder as `reel.py`. Change `TEMPO`, `GAP`, `CH`, the shots, the end card, the fader and the `R.mix` line. **Delete Maradona's values:** `scenes='scenes2'`, `base()` and the two map functions (they need his `pitch.png`), `join=(15.839,33.294)` (a new track has its own bars; leave `join` out unless the track is too short), `end_src=38.9` and `crowd`. Crowd sound is optional: Maradona's came from the sound of two Higgsfield video test clips at 22.5 credits per 5 s, never from match footage. `R.extend[name]=(cut,ty)` is for a wide painting: `cut` is the rows faded off its top and `ty` the row where the blurred top strip starts. Keep the engine as it is; if a rule must change, change `reel_engine.py` and rerun the Maradona regression below.

- `CH` is one list per voice line; each chunk is `(words, caption, accented words, y)`. The word count has to match what the transcriber hears, and the build stops if it does not, which is what keeps captions on the words.
- `R.anim(painting, start, end, (zoom0, zoom1, dx0, dx1, dy0, dy1))`, with times from `wt(line, word)` and `lt(line)`. Pace: the approved Reel has 20 shots in 43.7 s, most of them 1 to 2.6 s, shortest 0.73 s, longest 6 s. Cut on the words and keep something moving.
- `R.mix(...)`: see "Sound" in `standards.md`.

### 7. Check, then have it checked

```bash
~/Developer/football-stories-samples/.venv/bin/python -I ~/Developer/football-stories-101/.claude/skills/narrated-reel/scripts/check_reel.py final.mp4
```

It measures the file, loudness, AI tag, caption speed, voice over music, sudden steps, pumping, the ending and every word. Then read `build/contact.jpg` and open full-size frames at each cut and caption. A clean run does not finish the job: anything measured here can still look or sound wrong.

Run `npm run verify`, then have the `verifier` subagent, which did not make it, check against `standards.md` with the sound stems, frames and sources. Fix what it finds and recheck what changed. Say plainly what no one could verify: an agent cannot hear, so say the mix was measured and only a person can judge it.

### 8. Show the owner

Send the file with `SendUserFile`, `display: attach`, and say to play it in their own video player: the in-app preview played it silently on 7 Nov. Give them what changed, what was checked, what could not be checked. Only their ear approves the sound.

### 9. Post, only with the owner's OK

See `references/posting.md`. Instagram and Threads carry a new-format test; Facebook is the control unless the owner says otherwise. Write the caption with the AI and photo credit line, add new photos to `data/reference-photos.json`, confirm on each network that it went live, and log it in `docs/growth-log.md`.

## Testing the engine

After changing `reel_engine.py`, rebuild the approved Reel: `cd ~/Developer/football-stories-samples/maradona-reel && ../.venv/bin/python -I reel.py`. Its picture must still hash to `a4854021c599d372c0eb7ec865f6708f` and its sound to `70b048643eb461f002e0302b45524221`:

```bash
ffmpeg -v error -i final.mp4 -map 0:v -f framemd5 - | grep -v '^#' | md5
```

(with `-map 0:a` for sound). A deliberate change to the sound or pictures will change these: update them here once the owner has approved the new result.
