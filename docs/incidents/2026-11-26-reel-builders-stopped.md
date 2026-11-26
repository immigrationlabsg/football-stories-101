# 26 Nov 2026: 039's picture Reel was not built in time

## What happened
`npm run verify` reported at the 08:16 delivery check on 26 Nov: "039: posts within 2 days and has no picture Reel yet".
Story 039 (Celtic, Lisbon Lions) posts on 27 Nov at 08:00 Singapore. Its script, fact check and voice clips were done
on 22 Nov (`assets/narration/039`, still uncommitted), but there was no finished video and no `narratedReel` in the story.

Task 8 (daily picture Reels, 09:00, `docs/scheduled-tasks.md`) runs from the Mac through `ops/mac/run-task.sh` (`claude -p`).
Its logs in `~/Library/Logs/football-stories-101/` show:

| Day | What stopped it |
|---|---|
| 22 Nov | The five builder subagents (039 to 043) were still working 10 minutes after the session's last turn; `claude -p` stopped them ("Background tasks still running 10m after the last turn … stopping them"). |
| 23 Nov | The 5-hour usage limit was used up; the run quit at once. |
| 24 Nov | Higgsfield had 9.29 credits, under the task's 100-credit stop line; the run asked the owner and stopped. |
| 25 Nov | The builders were stopped after 10 minutes again. Only 043 left a `final.mp4`, which was never checked or installed; 039 stopped at the photo stage. |

## Cause (in our code)
`run-task.sh` started `claude -p` with its default limit: background subagents are stopped 10 minutes after the last
turn. Task 8 hands each Reel to a background subagent, and one build (paintings, mix, checks) takes far longer than 10
minutes. The run then finished with "exit 0", so nothing flagged it as a failure.

## Fix
`ops/mac/run-task.sh` now sets `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=10800000`, so a run waits up to 3 hours for its
subagents (the limit stops a stuck builder from holding the job forever). Higgsfield was back at 6,719 credits on
26 Nov, so the 09:00 task 8 run that day can build 039 first.

## Still open
- Check the 26 Nov 09:00 task 8 log, and confirm 039 has `narratedReel`, a release asset and a green Build and deploy
  before 27 Nov 08:00 Singapore. If it does not, 039 goes out without a picture Reel. That happens unless someone builds it by hand that day.
- The Mac's Claude sign-in ends between 29 Nov and 2 Dec (warning in every task log). The owner has to run
  `claude setup-token` (or `claude auth login`) on the Mac before then, or every scheduled task stops.
- Side effect of the fix: task 8 can now run until about 12:00, so it can overlap the 11:10 Facebook swap task in the same
  folder, and five long builders use more of the 5-hour usage limit (that limit stopped the 23 Nov run).
