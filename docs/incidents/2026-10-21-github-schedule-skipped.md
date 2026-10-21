# Incident: morning run never started, 21 October 2026

## What happened
- Story 002 was due at 08:00 Singapore time. Facebook was pre-scheduled in Meta.
- None of the eight GitHub scheduled tries (06:07 to 08:27) started. Since launch GitHub has started only 2 of 11
  scheduled morning runs, each hours late (19 Oct 02:23 UTC, 20 Oct 05:02 UTC).
- The Claude delivery check fired on time at 08:16:35, found Instagram and Threads missing, confirmed no posting run was
  in progress, and posted them once. They went out at 08:19. Nothing was posted twice.

## Cause
GitHub Actions scheduled workflows are "best effort" and, for this repository, mostly not started at all. The fix of
20 Oct (eight tries) still depended on GitHub's scheduler.

## Change
- A Claude scheduled task (which fires on time) now starts "Publish daily" at 07:50 (09:50 at weekends) with
  `wait_for_slot`; the run waits until 08:00 (10:00) and posts. GitHub's own schedule stays as a backup.
- The 08:16 Claude delivery check and the GitHub delivery check stay in place.

## Still depends on
The Claude scheduled tasks run in the owner's Claude account and wake the Claude Code session they were created in.
If that session is archived, recreate the tasks "FS101 start morning post" and "FS101 delivery check" from a new one.
