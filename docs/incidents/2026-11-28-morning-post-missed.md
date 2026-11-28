# 28 Nov 2026: 040 posted at 14:00 instead of 10:00

## What happened
Story 040 (Riquelme v Ronaldinho) was due at 10:00 Singapore. Nothing posted. At 13:59 the owner asked why.
- **Task 1 (09:50, the Mac):** it starts the morning post through `claude -p`. The run stopped at once with "You've hit your 5-hour limit · resets 1pm".
- **Earlier tasks:** task 4 (08:47) and task 8 (09:00) had used up the limit with long Reel and story builds.
- **Task 2 (10:16, delivery check):** it stopped for the same reason, so nothing raised the alarm.
- **GitHub backup:** the "Publish daily" schedule (00:07 to 02:27 UTC at weekends) had not fired by 06:00 UTC. GitHub has been running these schedules 4 to 8 hours late, as the run list from 25 to 27 Nov shows.

## Fix
- **Posted by hand:** at 14:00, through a manual "Publish daily" run. Facebook, Instagram and Threads all posted, then TikTok and YouTube from the automatic follow-on run.
- **Task 1 no longer needs Claude:** `ops/mac/run-task.sh` now runs its three fixed steps directly with `gh`. It checks for a run already in progress, starts one with `wait_for_slot`, and never starts two. A usage limit or an expired Claude sign-in can no longer stop the daily post.

## Still open
- Task 2 (delivery check) and task 8 (Reels) still need `claude -p`.
- The Mac's Claude sign-in ends between 29 Nov and 2 Dec. The owner has to run `claude setup-token` on the Mac before then.
