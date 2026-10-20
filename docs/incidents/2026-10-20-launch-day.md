# Incident: launch day, 20 October 2026

## What happened
1. **Instagram and Threads did not post at 08:00.** Facebook went out at 08:00:04 because Meta held the scheduled
   post. Instagram and Threads depend on the GitHub "Publish daily" job, which GitHub never started: its scheduler is
   "best effort" and drops or delays on-the-hour jobs (only 1 of 3 runs since setup had started, 2h23m late). The owner
   noticed first, at 08:17. Story 001 was posted by hand at 08:18.
2. **Threads had no pictures.** The Threads post was text only, with the Instagram link as a separate reply. The owner
   asked for the same layout as Instagram.
3. **A duplicate Threads post.** Reposting with the cards, a GitHub request reported a timeout but had gone through; a
   second request ran in parallel with a stale record and posted again 43 seconds later. Cancelled too late.
4. **Old posts could not be deleted automatically.** Meta refused: the Threads key has no delete permission, and
   Instagram's API cannot delete. The owner deleted them by hand.
5. Final state: story 001 on Facebook (08:00), Instagram (08:18), Threads (08:38, one post with cards and the link).

## Changes made
- Daily run asked eight times each morning at odd minutes; it waits for the slot, posts, saves the record at once,
  then rebuilds the site. Later runs do nothing; a failed network is retried; scheduled runs never fall back to the archive.
- The posting record is refreshed right before posting, and saved even when one network fails.
- Posting and scheduling jobs share one queue, so two can never post at once.
- Threads posts the same 7-card carousel as Instagram, with the Instagram link inside the post and no reply.
- Delivery check 20 minutes after each slot (GitHub workflow plus a Claude check-in that reposts anything missing).
- Key refresh four times a month; evening check twice a night.

## Lessons
- Never trust a GitHub schedule on its own; check the real outcome after every slot.
- After a request times out, confirm it did not go through before sending it again.
- Every change is checked by the independent verifier before it is reported done (it caught the Monday re-pick bug,
  the duplicate risk and the late record saves).
