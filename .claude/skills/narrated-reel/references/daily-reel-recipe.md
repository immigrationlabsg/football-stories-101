# Recipe: a daily story as a picture Reel

The owner's rule (8 Nov 2026): every Reel is storytelling with pictures behind the captions, narration, and music sample 3 or 4, on Facebook, Instagram and Threads. No wording-only cards. Daily stories are built the way the Zidane Reel (908) was, so a viewer can't tell a daily post from an ad hoc one.

This recipe is what differs from the skill's steps. `SKILL.md` and `standards.md` hold everything else.

## What is fixed

| Thing | Rule |
|---|---|
| Script | Owner, 8 Nov 2026: the Reel must hold a viewer for about 45 s, so it is written for that, not read off the cards. About 100-110 spoken words in 8 lines: (1) a hook that states the impossible-sounding outcome in under 12 words, over the event picture; (2-3) the setup, fast; (4) a turn that opens a question the viewer wants answered; (5-6) the escalation; (7) the payoff, the number or moment; (8) the story's question. Short sentences, concrete names and numbers, present tense allowed, no 'here's what I didn't know'. Every fact comes from the story's fact-checked text (body, facts, dek); nothing new. You may leave facts out of the Reel (the caption keeps them all) but say which in PROVENANCE.md. Lines go in `lines.json` of the build folder; numbers written as said. Worked examples: story-021-v2 (Denmark) and story-022-v2 (van Persie v Salah) in ~/Developer/football-stories-samples. |
| Voice | `text2speech_v2`, variant `elevenlabs`, voice_type `preset`, voice_id `b847bc29-f184-583a-8ad9-d1f1e16d1a60` (Dylan, the owner's choice on Zidane). About 6 jobs at a time; on a 429, wait and resend only those. |
| Music | Even story number: `~/Developer/football-stories-samples/music-style-samples/raw/3-sports-documentary.mp3`, `end_src` 62.5. Odd: `4-cinematic-trailer.mp3`, `end_src` 65. Never generate new music, never classical. Mix as `como-reel-v2` (sample 3) or `maradona-reel-v2` (sample 4). The Reel must be shorter than `end_src`. |
| Pictures | 6 to 12 paintings, one per beat, behind the captions all the way. First frame is the event the world knows, not a portrait or collage. Start from the story's entries in `data/reference-photos.json`. |
| Pace | A new picture or a clear push-in every 2-3 s, cut on the beat of the words (the turn, the payoff). 12-16 pictures for 45 s. Music lifts into the payoff and the question. |
| Sources | Owner, 8 Nov 2026: Pinterest photos may be used ("don't need to care about copyright"). Take the real event photo from Commons or Pinterest, whichever has it: Pinterest signed out in the built-in browser (`https://www.pinterest.com/search/pins/?q=...`, swap `736x` for `originals` for a bigger file). Always paint it, never post it raw; remove watermarks, photographer credits, card frames and overlay text. Log each source URL in `PROVENANCE.md`; Commons licences still go in `licences.json`. A named player's painting comes from a real photo of that player. Real logos only, never invented. |
| No photo of a moment | Search Pinterest before falling back. Only if no real photo exists anywhere: a true, drawn scoreboard or timeline as on Como, or a general picture that doesn't claim to be that moment. Never paint an invented moment. |
| Ending | The question spoken with its caption over the last picture, then the page's ending card (`closing_card.ts`, `R.closing()`), held 4 s. No credits on the card (owner, 8 Nov 2026): it shows STORY NO. NNN and the question only. |
| Picture behind every caption | No caption over a dimmed blur or a plain panel: a real, visible picture all the way. A picture must not say the opposite of the words (van Basten holding a cup under his missed penalty was rejected), and no player shown at a match he missed. |
| Extended paintings | Paint with real room rather than `R.extend` mirroring where people's feet or a crowd reach the edge: mirrored boots and crowds were caught on 020. |

## Steps

1. Work in `~/Developer/football-stories-samples/story-NNN/`. Copy the clips to `lines/`, the music to `music.mp3`, `style.jpg` from `maradona-reel/`.
2. Follow the skill's steps 2, 3, 6 and 7. Look at every painting and frame at full size.
3. `check_reel.py` on `final.mp4`, read every result, and measure for ticks at line edges too: it misses them.
4. Someone who did not build it checks it: frames, words against `lines.json`, sound measures, licences.
5. No credits on the Reel or in any caption (owner, 8 Nov 2026: "Just mention illustrated with AI in the caption"). Do not run `credit_end.py` (retired). Credits go only in the story's `reelCredits`, which the story's web page shows under the hero ("Reel: ..."), so CC BY and CC BY-SA attribution stays public. Write the AI tag with exiftool.
6. `gh release upload reels final.mp4#NNN-<slug>.mp4`, under that name on the repository's public "reels" release, not in git: at about 25 MB and ten a week, git history would fill up. Set `narratedReel: "assets/reels/NNN-<slug>.mp4"` and `reelCredits` (under 200 characters, every author and licence) in the story, and add the new photos to `data/reference-photos.json`.
7. `npm run validate` and `npm run verify`, push, confirm the deploy. The site takes a Reel from 10 days before its date, because Pages holds 1 GB. Facebook's scheduled Reel is swapped outside 06:00-10:45 Singapore (scheduled task 9).

## Sensitive stories

Where a story involves illness, death or a child, nothing on screen shows or suggests the person affected, a hospital or a sickbed. Tell it through the football.

## The owner's checks

They judge by ear and by eye: would you send this to a friend? They rejected weak pictures, a name nobody knows, music they couldn't hear and choppy sound. Nobody here can hear, so report what was measured and name any word a person should listen to.
