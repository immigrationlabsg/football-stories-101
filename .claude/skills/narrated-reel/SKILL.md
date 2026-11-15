---
name: narrated-reel
description: Makes a narrated Football Stories 101 Reel from start to finish, in the owner's newest style (Zidane 908-v5, 15 Nov 2026): a surprising hook written in full on the first frame, then straight into the famous moment and what most fans don't know about it, paintings from real photographs on top with the words appearing on white below, a voiceover, background music with no choppy volume changes and the page's ending card. Use this whenever anyone asks for a new voiced, narrated or "Maradona-style" Reel or video for Football Stories 101, an extra post on football news (a result, a retirement, a record), or a remake of a story in the new format, and also when fixing the sound or pictures of such a Reel, even if they only say "make a video on Zidane" or "do one on Como". Every Reel, daily or extra, uses this style from 16 Nov 2026 (owner, 15 Nov 2026).
---

# Narrated Reel

The owner's test: *would you send this to a friend?* They rejected the first sample because they did not know the player, the pictures did not make them visualise the moment, and they heard no music. They called the next one choppy until the music mix was fixed. Those four complaints are why this skill exists.

Before starting, read [references/standards.md](references/standards.md). It holds every limit and the reason for it. [references/lessons.md](references/lessons.md) lists what was tried and rejected, so read it before trying anything clever. [examples/split-reel.py](examples/split-reel.py) (Zidane, story-908-v5) is the newest style as code (approved 15 Nov 2026; update this line when the owner approves a newer one), and the place to copy from. `examples/maradona-reel.py` stays only for the engine regression test at the end.

Keep the owner's project rules in force throughout (repo `CLAUDE.md`, `docs/picture-guide.md`, `docs/editorial-standards.md`, the handoff). Nothing is posted without the owner's OK.

**Keeping this skill current (owner, 11 Nov 2026).** After any new change or trial on a Reel, ask the owner whether it should become a rule here. When a new rule replaces an old one, delete the old one everywhere in this skill (SKILL.md, references, example), so the skill holds only the latest, most efficient version. Never keep two rules that disagree.

**Daily stories too (owner, 8 Nov 2026):** every Reel now has this style, on Facebook, Instagram and Threads. For a daily story, start from its fact-checked text, then research the lesser-known side (step 1, "How to write the script", item 1): follow [references/daily-reel-recipe.md](references/daily-reel-recipe.md). Ad hoc Reels follow the steps below in full.

## Where things live

- Each reel gets a folder: `~/Developer/football-stories-samples/<slug>/`. It is outside the repo because of its size and outside Documents so scheduled tasks can read it. It holds `lines/`, `photos/`, `scenes/`, `music.mp3`, `reel.py`, `licences.json`, `PROVENANCE.md`, `build/`, `final.mp4`.
- Python: `~/Developer/football-stories-samples/.venv/bin/python -I` (numpy, pillow, faster-whisper). If it is missing: `python3 -m venv` there and `pip install numpy pillow faster-whisper`.
- Scripts: this skill's `scripts/` folder. `reel_engine.py` does the work, `check_reel.py` measures the result, `commons.py` finds photos and licences, `paint.sh` paints.

## Steps

### 1. Pick the story and write the script

**Work with the owner by [references/story-development.md](references/story-development.md) (owner, 16 Nov 2026).** In short: pitch 4 to 6 options before building anything. Take the owner's arc (hook, middle, payoff, question) and research each beat, saying plainly when one isn't true. Settle on one hard hook fact and stick to it. Get an OK on the script, then build a fast first cut. Offer a depth pass of 2 or 3 extra facts on the same thread. Build the setback-to-triumph arc in from draft 1. Before anything reaches the owner, the `reel-evaluator` agent must pass it at the pitch, script and final-cut gates ([references/evaluators.md](references/evaluators.md)).

**Finding the story (the owner's steps, 7 Nov 2026), in this order:**

1. What is the trending recent news in football?
2. Is there a rags-to-riches story in it, such as a low-division team reaching the top tier (Como: bankrupt in the fourth division in 2017, nine goals in the Champions League in 2026)?
3. What is the story of the key person behind the success? Take Cesc Fabregas: his route from youth player to manager, his story as a player, or how he started at Como and got to now.

These steps need not fit into one Reel. The owner: "you don't have to combine all into one topic necessarily. You could also break it down for more content over time." One news event can give several posts over time: the club's rise in one, the key person in another.

Keep to the story that serves that rise. On Como the owner cut a side fact, "It doesn't matter whether Essien's wife bought it. We only want to show their story of become rags to riches." A fact can be true and interesting and still not belong. Classic stories with a famous name (Maradona 1986) remain fine.

Write about 8 to 10 short spoken lines, 125 to 175 words, 48 to 63 seconds in all (Zidane 908-v5: 9 lines, 48 s). The Reel must stay shorter than the music's `end_src`, with one bar-line repeat if needed.

**How to write the script (owner, 15 Nov 2026; replaces the 11 Nov "one-person paradox" hook, the stacked "It wasn't..." list and the "Stay with this, because..." line).** **Standing rule for every Reel, daily and extra, from 16 Nov 2026.** The owner, the evening of 15 Nov: "From now on, ensure all reels are generated like the zidane reel in terms of the hook and scripting." It was proven on Instagram: Zidane 908-v5 reached 1,379 views and 18 likes within about three hours, the first Reel to outdo Denmark 021 (1,227 views). The owner: retelling what everyone knows makes our stories "redundant"; a "The man who..." hook makes a viewer think "mehh, I know what it's about" and swipe. Approved models: Zidane 908-v5, Messi 028-v5, Greece 029-v5, Lily Parr 030-v4 (all in `~/Developer/football-stories-samples/`).
1. **Research the lesser-known side first.** Before writing a word, find 4 to 6 true, surprising facts about the famous moment or person that most fans don't know, each from a source you opened (log them in the fact check). Zidane: the referee never saw the headbutt; the fourth official's voice in his headset; the Golden Ball anyway; the ban served as community work with children. If you can't find them, pick another angle or story rather than retelling the famous version.
2. **Line 0, the hook, is the single most surprising true fact, or a sharp contradiction, stated plainly.** It tells fans they don't know this story yet. Good: "The referee never saw Zidane's headbutt. So who sent him off?"; "Barcelona's record goalscorer. His first game for them? 'I should have shot.'"; "Bayern sacked him four days before a final. Eight years later, he won a bigger one." Never a description that gives the story away ("The man who faced Baggio on his debut, then gave Messi his"). A question alone is weaker than a stated fact with a mystery attached. Three or four rows at most.
3. **Line 1 goes straight into the famous moment, in one short line** ("Berlin, 2006. The last game of his career. A headbutt, and a red card."). No scene-setting build-up, no stacked list, no "Stay with this".
4. **The middle is the lesser-known facts, in order, each line adding something new**, building towards a payoff. Anything the hook promises must be told in the body (Greece v4 promised the Bayern sacking and never told it; the owner caught it).
5. **One thread, no detours.** Cut any fact that doesn't serve it, however true: the owner called a "same date" side line (Rijkaard faced Baggio in 1988) "pointless", saying it "made the script jump around".
6. **A payoff that lands late**, ideally tying back to the hook, then **a debate question people will send to a friend to argue about** ("Would you still have given him the Golden Ball?"), spoken with a caption over the last picture.
7. **Exact quotes only inside quotation marks.** A reworded quote becomes reported speech. Say "reportedly" for folklore or single-source claims, and keep each quote attached to the right moment and time (Messi's "I should have shot" was said straight after the game, about the saved chance).

**The first frame.**
- The whole of line 0 is on screen, in full, from the very first frame. That frame is also the cover and the YouTube tile, so its words must hook on their own.
- The picture under it is the person or the moment the hook names (Zidane B1: the referee showing the red card; Messi: his face), full width in the top panel for the whole hook.
- Spoken words and the first-frame caption match word for word. If the caption is reworded, re-voice line 0.
- The same hook goes everywhere (owner, 11 Nov 2026): set the story's `hook` field to line 0's exact words and `question` to the closing question. The hook becomes the YouTube title (plus #shorts), the first line of every caption (Facebook, Instagram, Threads, TikTok; `scripts/lib/social.ts` adds it for voiced Reels) and the banner on the Threads cards. If Facebook already has the post scheduled, run the Reels workflow with action `caption` for that story.
- Before building, show the owner a mockup of the first frame when there is a choice of hooks (the A/B1/B2 sheet on 15 Nov let them pick in one look).

**The objective, always: bring people history and stories that are memorable, so they want to share them with friends and choose to like or follow the account.** The owner's measure: shares in the first ~120 views. Earn that with the story. The rule against asking for likes, shares, tags or follows still stands.

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

The layout, the same from frame 0 to the ending card (`SPLIT=0.0`): the painting in a 1080 x 1100 window on top with a soft edge into off-white paper (250,250,248); the words below in Helvetica Neue 84 px, ink (17,17,17), key words bold only, all the same size, centred between y 1140 and 1600. Each chunk's words appear one by one on the voice, fading in from pale grey. The first chunk (line 0, the whole hook) has its reveal times set to -1, so it is complete on frame 0. Drawn fact chips (a date, a score, a quote, a number) and overlays sit inside the picture panel, clear of faces, as in 908-v5. (The old stacked "It wasn't..." list rows are no longer used.)

`shot(name,a,b,(z0,z1,(cx0,cy0),(cx1,cy1)))` moves the camera over the painting: zoom over "cover" and the window's centre in painting pixels. Times come from `wt(line,word)` and `lt(line)`. No shot over 6 s (the build stops). Keep `repair_clip` and `snap_all`: they clean clicks at clip starts and put words on the sound.

`R.extend` pads a painting to full-screen 9:16; the split layout doesn't need it (its window is nearly square), so don't use it. Keep the engine as it is; if a rule must change, change `reel_engine.py` and rerun the Maradona regression below.

- `CH` is one list per voice line; each chunk is `(word count, caption, bold words, y)`. The word count has to match what the transcriber hears, and the build stops if it does not, which is what keeps captions on the words.
- Pace: 908-v5 has 18 shots in 44 s before the card, most 1.5 to 3.5 s, never over 6 s. Cut on the words and keep something moving.
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
