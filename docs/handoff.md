# Handoff: working on Football Stories 101 from the owner's Mac mini

Written 3 Nov 2026 by the cloud session that runs the page. Read CLAUDE.md first, then this, then docs/runbook.md and
docs/growth-log.md (newest section last).

## Two ways to work from the Mac, and which to pick

1. **Recommended: connect the Mac to the cloud session** (it keeps every scheduled task). In Terminal on the Mac:
   ```
   cd ~/Documents
   git clone https://github.com/immigrationlabsg/football-stories-101.git
   cd football-stories-101
   claude remote-control
   ```
   Leave that window open, then tell the cloud session "the Mac is connected". It asks to use the folder (approve the
   prompt on the Mac) and can then also use the Mac's logged-in browser for Meta Business Suite, Instagram and OpenAI.
2. **A separate terminal session on the Mac** (`claude` in the same folder). It can do everything in this repository,
   but the scheduled tasks below keep firing into the cloud session, not into the terminal. Use it for one-off jobs
   (for example the Meta dashboard steps), not to replace the cloud session.

## What runs on its own (scheduled tasks)

The owner wants these moved to the Mac (3 Nov 2026). Full instructions and setup: docs/scheduled-tasks.md. Until the
Mac runs them, they keep firing into the cloud session.

| When (Singapore) | Task |
|---|---|
| Mon-Fri 07:50 / Sat-Sun 09:50 | Start the morning post (publish-daily.yml, waits for the 08:00 / 10:00 slot) |
| Mon-Fri 08:16 / Sat-Sun 10:16 | Delivery check: all three networks recorded, Facebook confirmed, one line to the owner |
| Thu 08:52 | Weekly research note and story-bank angles |
| Sat 08:47 | Weekly drafting: 7 pieces in the rhythm (comparison every 3rd day, quiz every 9th) |
| Mon 11:23 | Reminder to link Instagram to the Facebook Page (until it works) |
| Mon 12:41 | Weekly growth review: numbers, benchmarks, keep or drop last week's test, build the next |

## State on 3 Nov 2026

- **Posting:** every story to 014 went out on all three networks and was confirmed. 015 today too; its Instagram post
  is the first Instagram test Reel ("first frame", 3-8 Nov; docs/posting-format.md "Test running now").
- **Facebook Reels are invisible to the public** (docs/incidents/2026-11-03-facebook-reels-hidden.md). The owner wants
  them public: the posting app must be switched to Live by the owner in developers.facebook.com, then Claude checks and
  re-uploads hidden Reels if needed.
- **Instagram is still not linked to the Facebook Page** ("temporarily restricted"). Posting is unaffected.
- **OpenAI API credit** was added on 3 Nov (the API is billed apart from the ChatGPT plan; the first $20 went to
  ChatGPT credits by mistake). scripts/paint-gpt.ts now saves OpenAI's reported usage per painting in
  design/paintings/usage/.
- **044 (2 Dec), "Guess the legend: Marta": done.** Painted from a real 2018 photo, installed, independently verified;
  the record claim was narrowed to the Women's World Cup (the 2026 men's World Cup was not checked). Maradona moved to
  046 (4 Dec). 020 (8 Nov) was corrected to "first league game" and its Facebook Reel replaced and confirmed.
- **043 (1 Dec), "On this day: Raúl v Messi": painted and installed (3 Nov, Mac session).** Painted through Codex on
  the owner's ChatGPT plan (docs/fact-checks/043.md "Picture"); Munich 1968 moved to 047 (5 Dec). If Facebook scheduled
  Munich for 1 Dec before the push, run Reels switch 43 (dry run first, outside 06:00-10:45 Singapore) and confirm with
  Check a Facebook post.
- **Calendar:** verify warns that 046 (4 Dec) is an "on this day" day holding a regular story. Planned
  comparisons: 4 Dec Del Piero v Suárez, 7 Dec Ronaldo v Mbappé, 10 Dec Kane v Salah; regular stories 8-9 Dec
  (Galácticos; Beckham v Greece 2001 with a Legendary XI).
- **OpenAI support email** about the Messi refusals is drafted in the owner's admin@immigrationlab.sg Gmail (to
  support@openai.com); the owner may send it from the OpenAI account's own address.
- **Cost tests queued:** medium vs high quality and a smaller style reference, each shown to the owner side by side
  before any change.
- **Next weekly growth review:** Mon 9 Nov, judging the "first frame" test (5 Instagram posts, 3-8 Nov) against ~110
  reach and ~2 likes per Reel.
- **Experiments:** one per week on Instagram or Threads, Facebook as the control; winners rolled out everywhere so the
  page ends consistent (owner, 30 Oct). Calendar in docs/growth-log.md.

## Never (from CLAUDE.md, in short)

No painting of a named player that is not from a real photo of him; no key or token in chat, files or commits; no
website link on social posts; no cutting facts silently or adding one without a fact-check entry; no asking for likes,
shares or tags; no messaging other accounts. Run npm run verify and the verifier subagent before saying anything is
done, and confirm real outcomes (logs, Meta, data/sent.json).
