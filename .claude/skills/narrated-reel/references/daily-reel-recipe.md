# Recipe: a daily story as a picture Reel

The owner's rule (8 Nov 2026): every Reel is storytelling with pictures behind the captions, narration, and music sample 3 or 4, on Facebook, Instagram and Threads. No wording-only cards. Daily stories are built the way the Zidane Reel (908) was, so a viewer can't tell a daily post from an ad hoc one.

This recipe is what differs from the skill's steps. `SKILL.md` and `standards.md` hold everything else.

## What is fixed

| Thing | Rule |
|---|---|
| Script | The spoken lines are the story's cards, from `npm run narration -- plan N` into `assets/narration/NNN/lines.json`. They are already fact-checked, so no new research. You may change how a line is written so it is said correctly, never what it says. No added fact in voice, caption or drawn graphic. |
| Voice | `text2speech_v2`, variant `elevenlabs`, voice_type `preset`, voice_id `b847bc29-f184-583a-8ad9-d1f1e16d1a60` (Dylan, the owner's choice on Zidane). About 6 jobs at a time; on a 429, wait and resend only those. |
| Music | Even story number: `~/Developer/football-stories-samples/music-style-samples/raw/3-sports-documentary.mp3`, `end_src` 62.5. Odd: `4-cinematic-trailer.mp3`, `end_src` 65. Never generate new music, never classical. Mix as `como-reel-v2` (sample 3) or `maradona-reel-v2` (sample 4). The Reel must be shorter than `end_src`. |
| Pictures | 6 to 12 paintings, one per beat, behind the captions all the way. First frame is the event the world knows, not a portrait or collage. Start from the story's entries in `data/reference-photos.json`. |
| Sources | Commons only, under PD, CC0, CC BY or CC BY-SA, with each licence page read and logged in `licences.json`. Never agency or uncleared photos: the owner's Zidane exception was for that Reel only. A named player's painting comes from a real photo of that player. Real logos only, never invented. |
| No photo of a moment | A true, drawn scoreboard or timeline as on Como, or a general picture that doesn't claim to be that moment. Never paint an invented moment. If it would be weak, leave the story out and report it. |
| Ending | The question spoken with its caption over the last picture, then the page's ending card (`closing_card.ts`, `R.closing()`), held 4 s, with the photo credits small at its foot. |
| Picture behind every caption | No caption over a dimmed blur or a plain panel: a real, visible picture all the way. A picture must not say the opposite of the words (van Basten holding a cup under his missed penalty was rejected), and no player shown at a match he missed. |
| Extended paintings | Paint with real room rather than `R.extend` mirroring where people's feet or a crowd reach the edge: mirrored boots and crowds were caught on 020. |

## Steps

1. Work in `~/Developer/football-stories-samples/story-NNN/`. Copy the clips to `lines/`, the music to `music.mp3`, `style.jpg` from `maradona-reel/`.
2. Follow the skill's steps 2, 3, 6 and 7. Look at every painting and frame at full size.
3. `check_reel.py` on `final.mp4`, read every result, and measure for ticks at line edges too: it misses them.
4. Someone who did not build it checks it: frames, words against `lines.json`, sound measures, licences.
5. Write the credits on the ending card: `~/Developer/football-stories-samples/.venv/bin/python -I <skill>/scripts/credit_end.py final.mp4 "<reelCredits>"`, then rerun `check_reel.py`. A daily caption nearly fills Instagram's 2,200 characters, so on Instagram the credits are only on this card; Facebook's caption and the Threads reply carry them too.
6. `gh release upload reels final.mp4#NNN-<slug>.mp4`, under that name on the repository's public "reels" release, not in git: at about 25 MB and ten a week, git history would fill up. Set `narratedReel: "assets/reels/NNN-<slug>.mp4"` and `reelCredits` (under 200 characters, every author and licence) in the story, and add the new photos to `data/reference-photos.json`.
7. `npm run validate` and `npm run verify`, push, confirm the deploy. The site takes a Reel from 10 days before its date, because Pages holds 1 GB. Facebook's scheduled Reel is swapped outside 06:00-10:45 Singapore (scheduled task 9).

## Sensitive stories

Where a story involves illness, death or a child, nothing on screen shows or suggests the person affected, a hospital or a sickbed. Tell it through the football.

## The owner's checks

They judge by ear and by eye: would you send this to a friend? They rejected weak pictures, a name nobody knows, music they couldn't hear and choppy sound. Nobody here can hear, so report what was measured and name any word a person should listen to.
