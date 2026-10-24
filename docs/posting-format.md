# Posting format: final decisions (20 October 2026, Reels from 24 October 2026)

This is the standing format for every post. `npm run verify` checks it every evening and after every change;
change it only when the owner decides to.

## Schedule
- One story a day: **08:00 Singapore time Monday to Friday, 10:00 on Saturday and Sunday**.
- Stories 001 to 030 run from 20 October to 18 November 2026; the Saturday drafting run adds seven more each week.

## Reels, from 25 October 2026 (owner's decision, 24 Oct)
- **Every story dated 25 Oct 2026 or later posts as a Reel on Facebook, Instagram and Threads**, replacing the
  picture posts below. Stories up to 005 (24 Oct) stay exactly as they were posted.
- The Reel is "style B": the same 7 cards, each slowly zooming in and fading into the next, on a blurred copy of the
  card, 1080x1920, about 23 seconds (`scripts/lib/reel.ts`). Built with the website, up to 28 days ahead, at
  `/images/derived/NNN-reel.mp4`.
- **Music: royalty-free only**, public-domain orchestral recordings in `assets/music/` (credits in its CREDITS.md),
  rotating by story number. Trending or commercial songs cannot be added through Meta's API, and a song put into the
  file gets the Reel muted or removed.
- Text is unchanged: Facebook and Instagram carry the full story text; Threads the teaser with "More on Instagram".
- Facebook Reels are scheduled in Meta in advance like the picture posts were; Instagram and Threads Reels are posted
  by the daily run at the slot. `data/schedule.json` `reels_from` sets the start date.

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

## Threads
- **The same 7 cards as Instagram, in one post.**
- Text: the short teaser (opening, the reveal line, the first line after it), ending with
  **"More on Instagram: instagram.com/foot.ballstories101"** in the same post. **No separate reply.**
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
