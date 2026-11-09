# Posting format: final decisions (20 October 2026, Reels from 24 October 2026)

This is the standing format for every post. `npm run verify` checks it every evening and after every change;
change it only when the owner decides to.

## Schedule
- One story a day: **08:00 Singapore time Monday to Friday, 10:00 on Saturday and Sunday**.
- Stories 001 to 031 run from 20 October to 19 November 2026; the Saturday drafting run adds seven more each week.
- **"On this day" comparison every third day from 26 October 2026** (owner's decision, 25 Oct): 26 Oct, 29 Oct, 1 Nov,
  4 Nov and so on (`on_this_day_from` and `on_this_day_every` in `data/schedule.json`). Two stars' moments that both
  happened on that calendar date, compared, ending with a sharp either/or question (the first: 007, Le Tissier's chip
  over Schmeichel, 1996, v Totti's at San Siro, 2005: "Le Tissier or Totti: who was the greater one-club legend?").
  Only matches that were played or moments that happened to stars; never foundings, meetings or rule changes. The cover
  line starts "On this day". The music is the slot's own track (the rotation below). The story already in that slot
  moves to the end of the queue (Leicester City went from 007 to 031), and the Reels switch replaces its Facebook Reel.
  `npm run verify` warns about any upcoming third-day slot that is not yet an "on this day" story.
- **"Guess the legend" every 9 days** (owner's decision, 25 Oct; first on 5 Nov 2026, then 14 Nov, 23 Nov, 2 Dec and so
  on): a 7-card Reel with the shared mystery cover (no picture hint; from 27 Oct its banner carries the quiz's own hook line, e.g. "He grew up in a refugee hotel. Can you name him in 4 clues?"), four clues from obscure to famous, the reveal (the
  player's name over a painting made from a real photo of him) and a "send this to a friend" card. The caption hides
  the answer below the "See more" cut. Nine days keeps it on the day after a comparison, so the two never clash; if a
  date ever does fall on a comparison day, the comparison runs that day, the quiz the next day, and the rotation
  carries on as before. The owner approved the samples and the rhythm on 26 Oct 2026. On Facebook the quiz Reel's
  cover is the mystery card, so the answer never shows before the Reel is played.
- Every other day is the regular "story nobody told you".
- **One legend per week** (owner's decision, 26 Oct 2026): the same player is never featured in two pieces less than
  seven days apart (seven days apart is fine), unless it is a special week for that legend (listed in `data/schedule.json`
  "special_weeks"). Featured means either name of a comparison, a quiz's answer or a story's main subject; a passing
  mention in another story is not featuring.

- **A one-off extra post for huge news** (owner, 6 Nov 2026, first: Ronaldo's international retirement): `extra: true` in the story, a number from 906 up (900 was the first; 901-905 are taken in data/reference-photos.json), any hour, up to six fact cards, no story number on the closing card. It sits outside the calendar and rhythm checks. If it goes to all networks it is posted by a manual "Publish daily" run with its story number; that run also emails and posts to Telegram, so a story with `onlyOn` never goes that way. Only with the owner's OK each time.

- **Extra posts: narrated Reels** (owner, 7 Nov 2026; 8 Nov: on all three networks, Facebook is no longer the control): three a week, Tue, Thu and Sun at 20:00 Singapore, on Facebook, Instagram and Threads. Made by the weekly run (`docs/scheduled-tasks.md`, task 7) with the `narrated-reel` skill, posted after the owner's OK by workflow "Post extras", not by "Publish daily". Steps in `.claude/skills/narrated-reel/references/posting.md`.

## Narrated Reels, from 8 November 2026 (owner's decision, 8 Nov)
- **Every Reel has narration and music sample 3 or 4, on Facebook, Instagram and Threads**, including the three ad hoc posts a week. Even story numbers use sample 3 (sports documentary), odd numbers sample 4 (cinematic trailer); `TRACKS` in `scripts/lib/reel.ts`.
- **Every Reel is storytelling with pictures behind the captions, no wording-only cards (owner, 8 Nov 2026)**, made like the Zidane Reel with the `narrated-reel` skill. The voice (Dylan) reads the cards' own fact-checked words, so there are no new facts, and a Reel runs about 45 seconds. Clips are in `assets/narration/NNN/`; finished Reels are on the repository's public "reels" release (`narratedReel` in the story), and reach the site 10 days before their date.
- Threads keeps the cards with the Reel in the reply, as the ad hoc posts do. The Instagram and Facebook posts are the Reel.
- `narration_from` in `data/schedule.json` is the start date. A story from then with no voice gets no Reel, so its post fails loudly rather than going out with the old music. `npm run verify` is an error two days before that would happen.
- Task 8 makes five Reels a day at 09:00 until all are done; task 9 swaps Facebook's scheduled Reels at 11:05 (`docs/scheduled-tasks.md`). Instagram and Threads take the site's Reel at posting time, so they need no swap. The section below still describes how slots and uploads work; the classical music no longer applies from this date.

## Reels, from 25 October 2026 (owner's decision, 24 Oct)
- **Every story dated 25 Oct 2026 or later posts as a Reel on Facebook and Instagram, and with the Reel in a reply on Threads (from 28 Oct; see Threads)**, replacing the
  picture posts below. Stories up to 005 (24 Oct) stay exactly as they were posted.
- The Reel is "style B": the same 7 cards, each slowly zooming in and fading into the next, on a blurred copy of the
  card, 1080x1920, about 23 seconds (`scripts/lib/reel.ts`). Built with the website, up to 28 days ahead, at
  `/images/derived/NNN-reel.mp4`.
- **Music: four public-domain orchestral clips rotating day by day** (Beethoven's Egmont and Coriolan, Mozart's
  Symphony No. 40, Mendelssohn's Hebrides; owner's choice, 25 Oct 2026), in `assets/music/` (credits in its CREDITS.md).
  Each Facebook Reel's record names its music, e.g. "(music: coriolan)". Trending or commercial songs cannot be added through Meta's API, and a song put into the
  file gets the Reel muted or removed.
- Text is unchanged: Facebook and Instagram carry the full story text; Threads the teaser (see Threads below).
- **The cover line opens on the surprise** (owner, 27 Oct 2026): the first card's `hook` leads with the most surprising
  fact, not a scene-setter; for comparisons "on this day" / "to the day" may come later in the line.
- **AI disclosure** (owner's decision, 25 Oct 2026): every post from story 006 ends with the line "Illustrations made with
  AI." (Facebook and Instagram; on Threads only when it fits within 500 bytes without shortening the teaser), and every Reel file carries the IPTC tag DigitalSourceType =
  trainedAlgorithmicMedia, which Meta reads for its "AI info" label. Meta only requires a label for photorealistic video
  or audio; ours are paintings, so this is for trust, not a legal must.
- **Hashtags** (owner, 30 Oct 2026, from the Spirit Football benchmark): after the AI line, Facebook and Instagram end
  with up to five tags: #FootballHistory, the story's first two `clubs` and first two `players` (CamelCase, accents
  dropped). A quiz gets #FootballHistory #GuessTheLegend #FootballQuiz only, so no tag gives the answer away. Instagram
  keeps as many tags as fit in 2,200 characters, dropping from the end (most stories are written close to the limit, so
  often only #FootballHistory fits); the story is never cut for them, and verify warns if no tag fits. Threads has its topic tag instead.
- **The Legendary XI card** (owner, 30 Oct 2026): a story about a famous team may add a `lineup` (title, rows of names
  from attack down to the goalkeeper, exactly 11, an optional note). It becomes an extra card between the fifth fact and
  the closing card (8 cards, a Reel of 26.8 s instead of 23.4 s; its 25 s music clip is slowed slightly, pitch kept, so
  the fade-out still lands on the music), drawn by `scripts/lib/lineup-card.ts`: a pitch with gold
  dots and the names, no faces, so no photo or likeness question arises. Every name comes from two sources in the story's
  fact-check log. First used on 039, the Lisbon Lions (27 Nov).
- Facebook Reels are scheduled in Meta in advance like the picture posts were; Instagram Reels and Threads posts go out
  from the daily run at the slot. `data/schedule.json` `reels_from` sets the start date.

The sections below describe the picture posts (stories 001 to 005) and the text, which Reels keep.

## Facebook
- The square banner card (`NNN-fb.png`): the painting with the `hook` line on a dark banner.
- Text: the whole story, with "Here's what I didn't know until recently." starting before "See more", then the
  question, a `_____` rule and the sign-off "Football is full of stories nobody told you. I write one up every
  morning. Follow Football Stories 101."
- **Scheduled in advance in Meta** (visible in Business Suite's Planner), up to 27 days ahead; the daily run keeps it filled.

## Instagram
- **7-card carousel**: cover (painting plus banner), five fact cards from `facts`, closing card with the question.
- Caption: **exactly the Facebook text**; must fit 2,200 characters.
- Posted by the daily run at the slot time (Instagram cannot be scheduled through the API).

## Threads (owner approved 27 Oct 2026)
- **The 7 cards as a carousel with the teaser text and a topic tag** (`data/schedule.json` `threads_topic`, "Football").
  Threads drew 19-70 views per post with cards and 0-23 with the Reel in the first week, so the cards lead.
- **The Reel goes in a reply** under the post, with "The whole story as a Reel. More on Instagram:
  instagram.com/foot.ballstories101", so the post itself carries no link.
- Within Threads' 500 limit, counted in bytes.
- Posted by the daily run at the slot time.

## Experiments and the house look (owner, 30 Oct 2026)
The owner approved trying the queued experiments in docs/growth-log.md (including the shorter Reel, an Instagram
carousel, extra Threads posts and a Collab post) "and we'll measure the success", with one request: **the whole page
must end up consistent in how it is presented.** So:
- **One test at a time, one week each, one thing changed.** Everything else stays as above.
- **Tests run on Instagram or Threads only, where posts go out live each day, Tuesday to Sunday.** Facebook keeps the
  standard version as the steady control, so the page never shows two styles side by side on one network. A test video
  is a separate Instagram-only file; the shared Reel (Facebook, and the Threads reply) is never changed for a test.
- **Every test keeps the house look:** the dark and gold cards, Libre Baskerville and Inter, our own paintings, and each
  network's usual text (on Facebook and Instagram the sign-off, AI line and hashtags; on Threads the topic tag and the AI
  line as described above).
- **After each test, keep or drop, written in the growth log with the numbers.** A kept change becomes the standard on
  every network (Facebook Reels already scheduled are re-made and re-uploaded) and this file is updated; a dropped one
  is removed everywhere. By early December the page runs one consistent format again.

### Test running now
- **None (from 9 Nov 2026).** `data/schedule.json` `instagram_test` is null. Experiment 1 "first frame" (3-8 Nov) was
  dropped at the 9 Nov review (docs/growth-log.md); it never reached Facebook or Threads, so nothing else changes.
  Narrated Reels already open on the hook in large captions over a painting. The owner's 10-day trial of the voiced style
  (8-17 Nov) runs with no other test beside it; the next test is proposed in the trial report on 18 Nov.
- How a test is wired, for next time: stories in the `instagram_test` window with a `stinger` post `NNN-reel-ig.mp4` on
  Instagram only (`scripts/lib/test-cover.ts`). Set `instagram_test` to null when the test ends.

## Everywhere
- **No website link** on any post.
- Every picture credits its photo and says "Image generated with AI" (on the website).
- A story never goes out twice on the same network: `data/sent.json` records every post and schedule. Manual
  "Post to social" and "Schedule Facebook posts" runs share one queue; the daily run reads the record just before
  posting and saves it straight after. Never start a manual posting run between 06:00 and 08:45 (10:45 at weekends).

## Delivery
- **Start:** a Claude scheduled task starts the daily run at 07:50 (09:50 at weekends); the run waits for the slot,
  posts, and saves the record at once. GitHub's own schedule (eight tries each morning) is only a backup: it skipped
  every try on 21 Oct. Later runs do nothing once a story is out; a network that failed is retried.
- **Delivery check:** the GitHub "Delivery check" workflow runs 21 and 41 minutes after each slot and fails (emailing
  the owner) if any network is missing or Meta has not actually published the Facebook post. A scheduled Claude task
  (in the owner's Claude account, not in this repo) checks at 08:16 (10:16 at weekends), reposts anything missing
  once, and reports.
