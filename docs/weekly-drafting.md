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
   stick to documented events, and never repeat a story (a subject returns only with a new angle, marked as a follow-up); never feature
   the same legend in two pieces less than seven days apart (seven days apart is fine) unless data/schedule.json lists a
   special week for him (owner, 26 Oct 2026).
   Keep at least 20 reserved angles ahead.
3. Draft and fact-check each story exactly as the brief says, with web research, two sources per claim,
   verified quotes only, the living-persons rule, and a fact-check log in `docs/fact-checks/NNN.md`.
4. Scheduling:
   - if `launch_date` is null, save every story with `draft: true` and `date: 2027-01-01T00:00:00Z`;
   - otherwise give each new story the next free daily slot after the last scheduled story
     (Story No. 001 on `launch_date`; weekdays `T00:00:00Z`, weekends `T02:00:00Z`) and `draft: false`.
5. Mark them `drafted` (or `scheduled`) in the story bank.
5a. **The weekly mix (owner, 25-26 Oct 2026): 7 pieces a week.** Every third day from `on_this_day_from` is an
   "on this day" comparison; every ninth day from `guess_the_legend_from` is a "Guess the legend" quiz (if it ever
   lands on a comparison day, the comparison runs that day and the quiz the next); every other day is a regular story.
   `npm run verify` lists the upcoming comparison and quiz days that still hold a regular story. Fill every such day in
   the next 14 days, so the 7 new pieces each week are the comparisons and quizzes due plus regular stories for the rest.
   - **Comparison:** two moments involving famous players or teams on that calendar date (a match played, a goal, a
     debut, a record, an award; never a founding, meeting or rule change). Follow 007 and `docs/comparison-brief.md`: `hook` starting "On this day", `series: "On this day"`, body dates written out
     ("On 26 October 1996,"), a closing either/or `question` fans will argue about, 320 to 350 words, fact-check log.
   - **Quiz:** follow 017 (Pirlo): `format: quiz`, `series: "Guess the legend"`, four clues from obscure to famous
     (each true, two sources, at most 160 characters, never giving the name away before clue 4), `answer`, a 150 to
     250-word story told after the answer, `question: "How many clues did you need?"`.
   - **Handing over the day:** `npm run hand-over -- <slot number> <story.mdx> <fact-check.md>`. The new piece takes the
     slot's number, date and music; the story that was there moves to the end of the queue with its log and data.
     Push, wait until `/images/derived/reel-stories.json` on the site shows the new slug for that number, then, if
     Facebook already had the slot, run the Reels workflow (action switch, that number; Dry run first, then unticked)
     outside 06:00-10:45 Singapore time, and confirm with "Check a Facebook post" (`reel:<new id>`).
   - **Pictures:** every named player is painted from a real Commons photo (add the file to `data/reference-photos.json`
     with `kit`, then run "Paint with GPT Image"); a comparison needs one photo per player. Check the painting and the
     cards against the "Picture standard" in `docs/picture-guide.md` before handing over the day.
6. Run `npm run validate` and `npm run verify` and fix every error. Ask the `verifier` subagent to check the week's
   stories (facts against the fact-check logs, no repeated story, rotation, dates, length). Then commit to `main` with
   the message `content: stories NNN to NNN` and push. Paint each hero from a real photo (step 5a, Pictures) and check it
   against the picture standard; the text-only Illustrate workflow is only for scenes with no named player.
7. Re-read each new story once as a reader: would it make a football fan say "I never knew that"? If not,
   sharpen the opening and the turn before committing.
8. Report the headlines, any claim cut during fact-checking, and the editor's preview link
   https://immigrationlabsg.github.io/football-stories-101/preview/editors-desk/
