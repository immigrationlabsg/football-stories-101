# Standards for a narrated Reel

The numbers come from the Reel the owner accepted on 7 Nov 2026. `check_reel.py` tests the ones marked (M).

## Story
- A name or event most fans know. A surprising story about an unknown man asks too much in the first seconds.
- About 110 words, 40 to 45 s. 6 to 8 voice lines. It should earn its length; cut it if a line carries no new fact.
- Line 0 states the hook. A question or contradiction a fan wants resolved.
- Every claim logged in `docs/fact-checks/`; nothing added without an entry. Disputes flagged to the owner.
- No asking for likes, shares, tags or follows. An end question that starts an argument is fine.

## Picture
- File (M): 1080x1920, 30 fps, H.264 yuv420p.
- Every painting of a person comes from a real free Commons photo of that person (PD, CC0, CC BY, CC BY-SA). Empty places may be painted with no photo, as the picture guide allows. Note licence, author, source in `licences.json` (a blank author means read the file's page), credit in the caption.
- Whole paintings with camera moves only. Moving pictures made by AI drifted faces and shirts, and cut-out layers left headless players; both were tried and dropped.
- Faces must look like the person, every head inside the frame. Kit true to the photo: correct colours, numbers and badge. Keep the maker's and sponsor's logos as they appear in the photo; do not remove them (owner, 7 Nov 2026). Never invent one the photo does not show.
- Nothing important cut at the frame edge at any moment of a shot: hands, the ball, feet of main figures. Keep 10 px clear. Check the last frame of every zoom, not just the middle.
- Extended paintings must show no straight join or dark band; set `R.extend[name]=(cut,ty)` and look at the top and bottom of the frame.
- Picture pace as in the approved Reel: 20 shots in 43.7 s, most 1 to 2.6 s, longest 6 s. No same-painting jump: where one shot follows another of the same painting, its camera starts where the last one ended.
- Flash and shake: one in the Reel, on the biggest word, for a reason. No decoration.
- Drawn maps: markers and route must agree with the sources and with what the voice says on the same beat.
- AI tag (M): `XMP-iptcExt:DigitalSourceType` = trainedAlgorithmicMedia. `R.mix` writes it. Any later re-encode loses it: rewrite it.
- No black frames (M).

## Ending

- The last thing on screen is the page's own ending card, byte for byte the renderer the daily posts use, for 4 s with the question in italics. The spoken question gets a normal caption over the last picture before it.

## Captions
- Burnt in frame by frame by the engine, in Arial Black, white with a black outline, accent word in gold.
- On screen at least 0.9 s (M), no faster than 27 characters a second (M). Three rows at most.
- Keep y within 130 to 1536: Instagram's own buttons and text cover the rest.
- Must not sit over a face, the ball or a map marker. Move the chunk's `y` for that shot.
- Words match the voice. A dropped word in a caption is a fault unless it reads better and means the same.

## Sound
This is what the owner called choppy, then accepted once fixed. Keep to it.

- Loudness (M): -14 LUFS, within 1. True peak (M): -1 dBTP or lower. AAC, 48 kHz, stereo (M).
- **Voice over music (M): 8 to 18 dB per line.** About 10 to 14 reads well. Under 8 words get lost: at +1 dB one word was misheard. Too far above and the music disappears: the rejected Trautmann mix had the music 15 dB too low overall, and the owner heard none.
- **No stepped volume (M):** every change is a ramp through `fader` points, at least 1 s long under the voice. The largest 50 ms change in a 250 ms window stays at or under 6 dB, which is about the track's own beat.
- **No voice-triggered compressor (M):** do not use sidechain ducking. It lifted the music in every gap between words, which is what the owner heard as choppy. A steady level under the voice does the same job. Correlation between the music's level and voice activity stays under 0.2.
- **Same music all the way:** don't swap the track to fix a mix. The owner liked the music once it was mixed well, and turned down a smoother replacement.
- **If the track is too short, one repeat at most, on a bar line:** exactly N bars back (8 suits this track: same point in the chord cycle), with a 0.25 s crossfade ending on the downbeat. Under a crowd lift if possible. Measure the true bar length from the track; do not trust a search that aligns on onsets, whose score curve was flat and picked a 21 ms error. Chord match against the natural continuation at 0.9 or better; under 0.7 is an audible lurch.
- **Lay out from the end:** `end_src` lands the track's own ending at the end of the Reel, so the music finishes rather than fades away. The music is at its fullest on the end card, then its own decay plus a 0.4 s fade (M).
- Fader shape: hook slightly up, steady under the story, gentle lift for action, gentle dip of no more than 2 to 4 dB at the payoff, up on the end card.
- Crowd sound is a garnish: about 15 dB under the music, long fades, crossfaded if looped.
- Every word survives (M): transcribe the final mix and compare with the clean voice. Weak words: check by ear if you can, and by low transcriber confidence if you can't.
- Voice runs up to 1.15x; the last lines at 1.0x so the ending lands. Fades over clip ends are done by `R.mix`.
- If the owner still says choppy after this, the next suspect is the voice, which has many short silences. It would need a new read or re-spacing.

## Honesty
Say what was measured and how, and what wasn't. Numbers do not prove something sounds good, and no agent can listen. Not seen on a phone in the Instagram app unless someone did. One post tells us very little: treat early numbers as a lead.
