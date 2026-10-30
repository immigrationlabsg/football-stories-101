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
