# Weekly drafting run

A scheduled Claude Code session runs this every Saturday morning (Singapore
time). It is the standing instruction for that session; edit it here to change
what the weekly run does.

1. Read `docs/drafting-brief.md`, `docs/editorial-standards.md`, `docs/story-bank.md` (including its "Rules for new angles"),
   `data/schedule.json` and the newest note in `docs/research/`.
2. Take the next 7 angles marked `reserved` in the story bank, by number. If fewer than 7 remain, first add new
   angles to the bank: keep the player, club, era, moment rotation, mix eras and continents, include women's football
   and on-this-day anniversaries in the coming two months (only matches that were played or moments that happened
   to football stars, never foundings, meetings or rule changes), build at least half around globally famous players or teams,
   tell African, Asian and North American stories only through players with a European or world profile,
   stick to documented events, and never repeat a story (a subject returns only with a new angle, marked as a follow-up).
   Keep at least 20 reserved angles ahead.
3. Draft and fact-check each story exactly as the brief says, with web research, two sources per claim,
   verified quotes only, the living-persons rule, and a fact-check log in `docs/fact-checks/NNN.md`.
4. Scheduling:
   - if `launch_date` is null, save every story with `draft: true` and `date: 2027-01-01T00:00:00Z`;
   - otherwise give each new story the next free daily slot after the last scheduled story
     (Story No. 001 on `launch_date`; weekdays `T00:00:00Z`, weekends `T02:00:00Z`) and `draft: false`.
5. Mark them `drafted` (or `scheduled`) in the story bank.
5a. **"On this day" comparisons (owner, 25 Oct 2026).** Every third day from `on_this_day_from` in `data/schedule.json`
   is an "on this day" comparison; `npm run verify` lists the upcoming slots that still need one. For each such slot in
   the next 10 days: find two moments involving famous players or teams that happened on that calendar date (a match
   played, a goal, a debut, a record, a red card; never a founding, meeting or rule change), draft it like 007 (cover
   `hook` starting "On this day", `series: "On this day"`, a closing either/or `question` that fans will argue about,
   fact-check log with two sources per claim), and paint it (Paint workflow with a scene note; no real faces).
   Give it the slot's number and date, and move the story that was there to the end of the queue: rename its file and
   fact-check log to the next free number, give it the day after the last story, move its rows in
   `data/reference-photos.json`, `data/reference-queries.json` and `docs/story-bank.md`, and add
   `"story": "<old slug>"` to the slot's Facebook record in `data/sent.json`. Push, wait until
   `/images/derived/reel-stories.json` on the site shows the new slug for that number, then run the Reels workflow
   (action switch, that number, Dry run first, then unticked) outside 06:00-10:45 Singapore time, and check with
   "Check a Facebook post" (`reel:<new id>`) that the new Reel is scheduled. If no pair of star moments fits a date,
   use a single on-this-day star moment; if there is none, leave the slot as it is and say so in the report.
6. Run `npm run validate` and `npm run verify` and fix every error. Ask the `verifier` subagent to check the week's
   stories (facts against the fact-check logs, no repeated story, rotation, dates, length). Then commit to `main` with
   the message `content: stories NNN to NNN` and push. The Illustrate workflow paints the heroes automatically.
7. Re-read each new story once as a reader: would it make a football fan say "I never knew that"? If not,
   sharpen the opening and the turn before committing.
8. Report the headlines, any claim cut during fact-checking, and the editor's preview link
   https://immigrationlabsg.github.io/football-stories-101/preview/editors-desk/
