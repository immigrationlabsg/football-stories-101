# Posting format: final decisions (20 October 2026)

This is the standing format for every post. `npm run verify` checks it every evening and after every change;
change it only when the owner decides to.

## Schedule
- One story a day: **08:00 Singapore time Monday to Friday, 10:00 on Saturday and Sunday**.
- Stories 001 to 030 run from 20 October to 18 November 2026; the Saturday drafting run adds seven more each week.

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
- The daily run is asked eight times each morning (GitHub's scheduler is unreliable); whichever starts first waits
  for the slot, posts, and saves the record at once; later ones do nothing; a network that failed is retried.
- **Delivery check:** the GitHub "Delivery check" workflow runs 21 and 41 minutes after each slot and fails (emailing
  the owner) if any network is missing or Meta has not actually published the Facebook post. A scheduled Claude task
  (in the owner's Claude account, not in this repo) checks at 08:16 (10:16 at weekends), reposts anything missing
  once, and reports.
