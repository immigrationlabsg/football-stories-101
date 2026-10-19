# Weekly drafting run

A scheduled Claude Code session runs this every Saturday morning (Singapore
time). It is the standing instruction for that session; edit it here to change
what the weekly run does.

1. Read `docs/drafting-brief.md`, `docs/editorial-standards.md`, `docs/story-bank.md` (including its "Rules for new angles"),
   `data/schedule.json` and the newest note in `docs/research/`.
2. Take the next 7 angles marked `reserved` in the story bank, by number. If fewer than 7 remain, first add new
   angles to the bank: keep the player, club, era, moment rotation, mix eras and continents, include women's football
   and on-this-day anniversaries in the coming two months, build at least half around globally famous players or teams,
   stick to documented events, and never repeat a story (a subject returns only with a new angle, marked as a follow-up).
   Keep at least 20 reserved angles ahead.
3. Draft and fact-check each story exactly as the brief says, with web research, two sources per claim,
   verified quotes only, the living-persons rule, and a fact-check log in `docs/fact-checks/NNN.md`.
4. Scheduling:
   - if `launch_date` is null, save every story with `draft: true` and `date: 2027-01-01T00:00:00Z`;
   - otherwise give each new story the next free daily slot after the last scheduled story
     (Story No. 001 on `launch_date`; weekdays `T00:00:00Z`, weekends `T02:00:00Z`) and `draft: false`.
5. Mark them `drafted` (or `scheduled`) in the story bank.
6. Run `npm run validate` and `npm run verify` and fix every error. Ask the `verifier` subagent to check the week's
   stories (facts against the fact-check logs, no repeated story, rotation, dates, length). Then commit to `main` with
   the message `content: stories NNN to NNN` and push. The Illustrate workflow paints the heroes automatically.
7. Re-read each new story once as a reader: would it make a football fan say "I never knew that"? If not,
   sharpen the opening and the turn before committing.
8. Report the headlines, any claim cut during fact-checking, and the editor's preview link
   https://immigrationlabsg.github.io/football-stories-101/preview/editors-desk/
