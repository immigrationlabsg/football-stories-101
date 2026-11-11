---
name: narrated-reel
description: Makes a narrated Football Stories 101 Reel from start to finish, in the owner's newest style (Lyon, 11 Nov 2026): a strong one-person hook written in full on the first frame, paintings from real photographs on top with the words appearing on white below, a voiceover, background music with no choppy volume changes and the page's ending card. Use this whenever anyone asks for a new voiced, narrated or "Maradona-style" Reel or video for Football Stories 101, an extra post on football news (a result, a retirement, a record), or a remake of a story in the new format, and also when fixing the sound or pictures of such a Reel, even if they only say "make a video on Zidane" or "do one on Como". Not for the routine daily card Reels, which scripts/images.ts builds on its own.
---

# Narrated Reel

The owner's test: *would you send this to a friend?* They rejected the first sample because they did not know the player, the pictures did not make them visualise the moment, and they heard no music. They called the next one choppy until the music mix was fixed. Those four complaints are why this skill exists.

Before starting, read [references/standards.md](references/standards.md). It holds every limit and the reason for it. [references/lessons.md](references/lessons.md) lists what was tried and rejected, so read it before trying anything clever. [examples/split-reel.py](examples/split-reel.py) (Lyon, story-024-v9) is the newest style as code (built 11 Nov 2026; update this line when the owner approves a newer one), and the place to copy from. `examples/maradona-reel.py` stays only for the engine regression test at the end.

Keep the owner's project rules in force throughout (repo `CLAUDE.md`, `docs/picture-guide.md`, `docs/editorial-standards.md`, the handoff). Nothing is posted without the owner's OK.

**Keeping this skill current (owner, 11 Nov 2026).** After any new change or trial on a Reel, ask the owner whether it should become a rule here. When a new rule replaces an old one, delete the old one everywhere in this skill (SKILL.md, references, example), so the skill holds only the latest, most efficient version. Never keep two rules that disagree.

**Daily stories too (owner, 8 Nov 2026):** every Reel now has this style, on Facebook, Instagram and Threads. For a daily story, the script and voice come from its cards: follow [references/daily-reel-recipe.md](references/daily-reel-recipe.md). Ad hoc Reels follow the steps below in full.

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

Write about 9 short spoken lines, 150 to 175 words, 55 to 63 seconds in all (Lyon: 9 lines, 62 s). The Reel must stay shorter than the music's `end_src`, with one bar-line repeat if needed.

**The hook and the first frame (owner, 11 Nov 2026; replaces the 7 Nov rule that the first frame shows the event).**
- Line 0 is a paradox about one person, in one sentence: "The coach who lost his job after winning the league and cup double", "The defender who knocked his own club out of the FA Cup, then built the club that won it".
- The whole of line 0 is on screen, in full, from the very first frame. That frame is also the cover and the YouTube tile, so the words on it must be a strong hook on their own: a contradiction a fan wants explained, with the person, the loss or win, and the twist. No half sentence, no scene-setting ("January 1975") on frame 0.
- The picture under it is that person's face, full width in the top panel, for the whole hook.
- Spoken words and the first-frame caption match word for word. If the caption is reworded, re-voice line 0.
- The same hook goes everywhere (owner, 11 Nov 2026): set the story's `hook` field to line 0's exact words. It becomes the YouTube title (plus #shorts), the first line of every caption (Facebook, Instagram, Threads, TikTok; `scripts/lib/social.ts` adds it for voiced Reels) and the banner on the Threads cards. If Facebook already has the post scheduled, run the Reels workflow with action `caption` for that story.

**The attention test comes first (owner, 7 Nov 2026).** Start from what fans already care about and argue over: the famous moment, the controversy, the name. Then give the angle they don't know. Would a fan stop scrolling in 3 seconds and send it to a friend to argue about? If the story rests on a person nobody knows, however true or moving, drop it (Zidane's father was rejected; Zidane's headbutt was what the owner wanted).

**The shape (owner, 7 Nov 2026): a recent trend that people relate to and that catches their attention, then history they may not know, then a hook question or something like it.** On Como: the 9-1, then bankrupt to Champions League, then "Who's the next Como?", spoken and on the end card. How that shape is expressed is left to our creativity, so vary it rather than repeating a template.

**The objective, always: bring people history and stories that are memorable, so they want to share them with friends and choose to like or follow the account.** Earn that with the story. The rule against asking for likes, shares, tags or follows still stands.

- **One person is the thread** through the story, set up early, and the ending pays them off (their exit, or an echo of the hook).
- The middle shows the moment step by step, so a viewer can picture it.
- A turn at about two thirds where the story has a real surprise. Say "But here's the part that surprised me" only if it did: Como's script does not use it.
- A short close that echoes the hook, then a question that starts an argument, spoken with a caption over the last picture.
- **Every Reel ends on the page's own ending card, the same as every other post (owner, 7 Nov 2026).** Make it with `npx tsx .claude/skills/narrated-reel/scripts/closing_card.ts "The question?" <folder>/closing.png` from the repo root, and end `reel.py` with `R.closing()`. It holds 4 s, as on the daily Reels, and shows no story number on an extra post. Never build a custom painted end card: `R.endcard` stays only so old builds can be read. The voice itself never asks for a like, share, tag or follow; the card's follow line is the page's standard wording.

Every claim needs a fact-check entry in `docs/fact-checks/`, two sources where they exist, and wording that stays inside what the sources say. Log disputed points and tell the owner. For news, confirm the result on UEFA, the league or a major outlet the same day, and date-stamp anything that may change ("fourth in the table" goes stale).

### 2. Find the pictures

**Pinterest allowed (owner, 8 Nov 2026):** when the real moment isn't on Commons, use a Pinterest photo and paint it; see `references/daily-reel-recipe.md`, Sources.

Use `commons.py search` and `commons.py get`. Any named player's painting starts from a free Wikimedia Commons photo under PD, CC0, CC BY or CC BY-SA (`docs/picture-guide.md`). Never Getty, AP, Reuters or PA, even as a reference. A paid licence is the owner's decision only. Read each file's licence page, record it, and credit it in `reelCredits` (shown on the story's web page). Plan one picture per beat of the story; a drawn pitch map or timeline is the honest answer for anything no photograph shows. Do not invent a moment by painting it with no source photo, and no match footage, no other account's pictures.

Show nothing you have not looked at. If there is no good photo of the key moment, say so early and change the story or the angle rather than settling for a weak picture: weak pictures were the first rejection.

### 3. Paint

Write `scenes.txt` (`name|photo|what to paint`; the photo name uses underscores, as `commons.py get` saves it) and `kit.txt` (kit rules for this match: true colours, numbers, and the crest, maker's logo and sponsor the photo shows; never invent one. Como's file left shirts plain, an approved one-off, so do not copy that line), copy `~/Developer/football-stories-samples/maradona-reel/style.jpg` into the folder, then run `paint.sh` from the reel's folder. This style overrides the loose square style in the picture guide for these Reels only. Describe only what the photo shows: a line such as "a match in progress" makes the painter invent one. `paint.sh` needs a photo for every scene; a painting with no people and no photo (the Maradona pitch) needs a direct `codex exec` of its own. Look at each painting at full size against `standards.md`, and repaint any that fail. Keep a painting whole; do not cut out figures. If the image system refuses a scene, do not reword it to slip past. Pick another picture or make a local colour edit of an existing painting, and tell the owner.

### 4. Voice

`mcp__higgsfield__generate_audio` (or `generate_audio_batch`), one file per line, saved as `lines/0.mp3`, `1.mp3`...:
`model: text2speech_v2, variant: elevenlabs, voice_type: preset, voice_id: b847bc29-f184-583a-8ad9-d1f1e16d1a60` (Dylan, the owner's choice on Zidane; Como and Maradona keep their earlier voice).
Spell out names and numbers as they should be said ("eleven"). Send them a few at a time: a batch of eight had one line refused for rate limits and that retry stayed queued for minutes.

### 5. Music

**Owner, 8 Nov 2026: every Reel uses sample 3 or 4, not new music.** Even story numbers: `~/Developer/football-stories-samples/music-style-samples/raw/3-sports-documentary.mp3` (`end_src` 62.5). Odd: `4-cinematic-trailer.mp3` (`end_src` 65). Copy it to the Reel's folder and mix it as `standards.md` says; `como-reel-v2` and `maradona-reel-v2` are the worked examples. A Reel must be shorter than `end_src`. The voice for new Reels is Dylan (`b847bc29-f184-583a-8ad9-d1f1e16d1a60`), the voice the owner chose for Zidane.

Only if the owner asks for other music: `elevenlabs_music_v2_5`, `force_instrumental: true`, `duration` in seconds. Ask for a track at least as long as the Reel plus 8 s, so no repeat is needed. Find where its sound ends with `ffmpeg -i music.mp3 -af silencedetect=n=-40dB:d=0.5 -f null -`: that `silence_start` is your `end_src`, measured for each track.

The owner kept the music in this prompt, so start from it:

> Instrumental cinematic sports documentary score at 110 BPM with a strong pulse from the first second: driving taut drums and staccato strings, tense and exciting. It builds steadily, surges to a huge thrilling peak with pounding drums and bold brass in the middle, drops to a tense single piano and low strings, then rises to a triumphant, emotional finish with a clean final hit. Loud and energetic throughout, no vocals, no silence at the start.

Reuse the same track on later Reels only if the owner wants a signature sound; never a commercial song.

### 6. Build

Copy `examples/split-reel.py` to the folder as `reel.py`. Change `CH`, `TEMPO`, `GAP`, the shots, the overlays, the question on the ending card, the fader and the `R.mix` line (`join` and `end_src` belong to the music track: keep them only with the same track and a Reel of the same length).

The layout, the same from frame 0 to the ending card (`SPLIT=0.0`): the painting in a 1080 x 1100 window on top with a soft edge into off-white paper (250,250,248); the words below in Helvetica Neue 84 px, ink (17,17,17), key words bold only, all the same size, centred between y 1140 and 1600. Each chunk's words appear one by one on the voice, fading in from pale grey. The first chunk (line 0, the whole hook) has its reveal times set to -1, so it is complete on frame 0. Line 1-style lists ("It wasn't... It wasn't...") stack as rows with a dark round cross (`LIST`). Overlays (scoreboard, counter, stars) sit inside the picture panel.

`shot(name,a,b,(z0,z1,(cx0,cy0),(cx1,cy1)))` moves the camera over the painting: zoom over "cover" and the window's centre in painting pixels. Times come from `wt(line,word)` and `lt(line)`. No shot over 6 s (the build stops). Keep `repair_clip` and `snap_all`: they clean clicks at clip starts and put words on the sound.

`R.extend` pads a painting to full-screen 9:16; the split layout doesn't need it (its window is nearly square), so don't use it. Keep the engine as it is; if a rule must change, change `reel_engine.py` and rerun the Maradona regression below.

- `CH` is one list per voice line; each chunk is `(word count, caption, bold words, y)`. The word count has to match what the transcriber hears, and the build stops if it does not, which is what keeps captions on the words.
- Pace: Lyon has 22 shots in 62 s, most 1.5 to 4 s, longest 6 s. Cut on the words and keep something moving.
- `R.mix(...)`: see "Sound" in `standards.md`.

### 7. Check, then have it checked

```bash
~/Developer/football-stories-samples/.venv/bin/python -I ~/Developer/football-stories-101/.claude/skills/narrated-reel/scripts/check_reel.py final.mp4
```

It measures the file, loudness, AI tag, caption speed, voice over music, sudden steps, pumping, the ending and every word. Its word list comes from the transcriber, so names it mishears (Lens, Serie A) need a person's ear; and it does not measure caption position. Then read `build/contact.jpg` and open full-size frames at each cut and caption. A clean run does not finish the job: anything measured here can still look or sound wrong.

Run `npm run verify`, then have the `verifier` subagent, which did not make it, check against `standards.md` with the sound stems, frames and sources. Fix what it finds and recheck what changed. Say plainly what no one could verify: an agent cannot hear, so say the mix was measured and only a person can judge it.

### 8. Show the owner

Send the file with `SendUserFile`, `display: attach`, and say to play it in their own video player: the in-app preview played it silently on 7 Nov. Give them what changed, what was checked, what could not be checked. Only their ear approves the sound. Also send the first frame as a still: it is the cover, so the owner judges the hook on it.

Once the owner confirms the Reel in the newest style, add its number to `data/new-style.json`. Reels post on their day only, and only once confirmed (owner, 11 Nov 2026); the 10:00 Singapore reminder task flags tomorrow's unconfirmed stories.

### 9. Post, only with the owner's OK

See `references/posting.md`. Every Reel goes to Facebook, Instagram and Threads, and the automatic run posts the same Reel to TikTok and YouTube through Zernio. TikTok adds a trending Commercial Music Library track on its own at volume 15 (`scripts/tiktok.ts`, `pickTrack`); never hand-pick it or ask the owner to. Instagram and YouTube keep the Reel's own music: their APIs can't add trending sound for this account. Captions carry only the AI line ("Illustrations made with AI."); photo credits go in `reelCredits` and show on the story's web page, never on the Reel or in captions (owner, 8 Nov 2026). Then add new photos to `data/reference-photos.json`, confirm on each network that it went live, and log it in `docs/growth-log.md`.

## Testing the engine

After changing `reel_engine.py`, rebuild the approved Reel: `cd ~/Developer/football-stories-samples/maradona-reel && ../.venv/bin/python -I reel.py`. Its picture must still hash to `a4854021c599d372c0eb7ec865f6708f` and its sound to `70b048643eb461f002e0302b45524221`:

```bash
ffmpeg -v error -i final.mp4 -map 0:v -f framemd5 - | grep -v '^#' | md5
```

(with `-map 0:a` for sound). A deliberate change to the sound or pictures will change these: update them here once the owner has approved the new result.
