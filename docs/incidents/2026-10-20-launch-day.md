# Incident: launch day, 20 October 2026

## What happened
1. **Instagram and Threads did not post at 08:00.** Facebook went out at 08:00:04 because Meta held the scheduled
   post. Instagram and Threads depend on the GitHub "Publish daily" job, which GitHub never started: its scheduler is
   "best effort" and drops or delays on-the-hour jobs (only 1 of 3 runs since setup had started, 2h23m late). The owner
   noticed first, at 08:17. Story 001 was posted by hand at 08:18.
2. **Threads had no pictures.** The Threads post was text only, with the Instagram link as a separate reply. The owner
   asked for the same layout as Instagram.
3. **A duplicate Threads post.** Reposting with the cards, a GitHub request reported a timeout but had gone through; a
   second run started 54 seconds later with a stale record and posted again (posts 43 seconds apart, 08:29:47 and
   08:30:30). Cancelled too late.
4. **Old posts could not be deleted automatically.** Meta refused: the Threads key has no delete permission, and
   Instagram's API cannot delete. The owner deleted them by hand.
5. The owner then asked for the Instagram link inside the Threads post, so story 001 was posted once more at 08:38 in
   the final format and the owner deleted the 08:29 and 08:30 posts.
6. Final state: story 001 on Facebook (scheduled for 08:00; Meta reported it published, created 08:00:04), Instagram
   (08:18) and Threads (08:38, one post with the cards and the link).

## Changes made
- Daily run asked eight times each morning at odd minutes; it waits for the slot, posts, saves the record at once,
  then rebuilds the site. Later runs do nothing; a failed network is retried; scheduled runs never fall back to the archive.
- The posting record is refreshed right before posting, and saved even when one network fails.
- Manual posting and scheduling runs share one queue; the daily run reads the record just before posting.
- Threads posts the same 7-card carousel as Instagram, with the Instagram link inside the post and no reply.
- Delivery check 21 and 41 minutes after each slot (GitHub workflow, including Meta's published status for Facebook)
  plus a scheduled Claude check-in at 08:16 that reposts anything missing.
- Key refresh four times a month; evening check twice a night.

## Lessons
- Never trust a GitHub schedule on its own; check the real outcome after every slot.
- After a request times out, confirm it did not go through before sending it again.
- Every change is checked by the independent verifier before it is reported done (it caught the Monday re-pick bug,
  the duplicate risk and the late record saves).
