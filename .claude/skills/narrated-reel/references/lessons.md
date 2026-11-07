# What was tried and what happened (7 Nov 2026)

| Tried | Result | So |
|---|---|---|
| Bert Trautmann, scenes with no people, music very low | Owner: don't know him, can't visualise it, no music, "even I would not share it" | Famous name, paintings of the moment, audible music |
| AI motion clips from paintings (Higgsfield grok_video_v15, 22.5 credits per 5 s) | Faces, shirts and numbers drifted, duplicate balls, a ball through the net | Camera moves on whole paintings. Moving pictures would be a new decision for the owner |
| Cut-out layers with parallax (macOS Vision) | Headless players, halos, vanishing balls | Dropped |
| Painting directly from the Commons photo with no kit rules | Invented logos, crests, wrong numbers | Give kit rules in `kit.txt`; look at each painting at full size |
| ffmpeg timed overlays for captions | Dropped every caption after the first still | Burn in frame by frame |
| Sidechain ducking plus stepped volume | Owner: choppy. Measured steps of 18 dB, 92 jumps over 3 dB, music rising 5 dB in each word gap | Fader ramps, steady level, no compressor |
| Splicing two parts of the track at an arbitrary point | Jumped mid-bar on a different chord | Bar-line repeat, exactly N bars, same chord cycle |
| Replacing the music with a smooth new track | Measured very well, but the owner preferred their music | Fix the mix before changing the music |
| Delivering the file as an inline preview | Owner heard nothing, though the file had sound | Send as an attachment, say to use their own player, keep an MP3 handy as a test |
| Louder music at +1 dB | "he remembered" misheard as "you remembered" | Re-transcribe after any level change |
| Codex refused one celebrate repaint | Not reworded to get past it. Used a local colour edit of the existing painting | Same again |
| Como script with Michael Essien's wife buying the club | Owner: doesn't matter, keep to rags to riches | Facts must serve the rise; check the three steps in SKILL.md |
| "No team has ever won by more" and "first ever season in Europe", both from good reports | Verifier: HJK 10-0 in qualifying; the 1980-81 Mitropa Cup. A fan would answer in the comments | Attribute a record to its source and test it against the records page; say the narrower true thing |
| Writing "blue shorts" into the kit rule without looking | Painted wrong: the photo has white shorts | Read the kit off the photo itself |
| Zooming a team painting that fills the width | Outer player cut at the edge | Leave grass either side when painting; don't zoom a full-width group |
| A custom painted end card with the question | Owner: posts should stay consistent and end on the page's own ending card | `closing_card.ts` plus `R.closing()`; the question is spoken with a caption just before it |
| `still()` shots from a JPEG are tagged full-range, and the concat decoder then lifts everything after them | Maradona's ending card came out at grey 31 against 16 on Como, seen only by sampling the pixel | `still()` now converts to TV range; sample the card colour in the final file |
| A true, moving story about someone nobody knows (Zidane's father) | Owner rejected it: "serves no purpose and attract nobody's attention" | Start from what fans already care about and argue over (the headbutt, not the father); the famous thing in the first 3 seconds; then the angle they don't know |
