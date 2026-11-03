# 3 Nov 2026: the public could not see any Facebook Reel

**What happened.** Facebook Reels from 29 Oct had 0 plays (Audience report, 2 Nov). The owner opened the Page in a
private window, logged out, on 3 Nov: "0 followers · 1 post", Reels tab "No reels yet". Every Reel our posting app
published or scheduled since launch was invisible to the public. Instagram and Threads were not affected (Instagram
reached 100+ accounts per Reel).

**Cause (most likely).** The Meta app that posts to the Page is in Development mode. Content an app publishes to a Page
in Development mode is shown only to people with a role on the app. CLAUDE.md says "never turn the Meta apps to Live",
so it was never switched.

**Decision.** The owner, 3 Nov 2026: "I want the facebook reels to be live." On the owner's instruction (3 Nov,
Mac session) CLAUDE.md's "Never" list now records it: the Facebook posting app goes Live; other Meta apps stay as they are.

**Steps (owner, on a computer).** developers.facebook.com → My Apps → the posting app → check "App Mode: Development" at
the top → App settings → Basic: Privacy Policy URL https://immigrationlabsg.github.io/football-stories-101/privacy/ and
a Category, Save → switch App Mode to Live.

**After the switch (Claude).**
1. Check a Reel from a logged-out private window (owner) and with Check a Facebook post.
2. If Reels uploaded in Development mode stay hidden, re-upload them with the Reels workflow (action replace, one story
   at a time, outside 06:00-10:45 Singapore), from the next due story onward, and confirm each.
3. Watch plays in the next Audience report.

**Status: fixed (4 Nov 2026, 00:20 Singapore).** The owner published the posting app ("Football Stories 101 publisher";
Meta now calls going Live "Publish" in the app's left menu) after adding a privacy policy URL: a Google Doc published to
the web from the page's own Google account (101footballstories101@gmail.com), so nothing points to the owner's other
work. Checked from a browser signed in to nothing: the Page's Reels tab shows ten Reels, and their IDs are exactly the
Facebook Reels recorded in data/sent.json for 006-015 (25 Oct-3 Nov); "Check a Facebook post" (run 41672121845) on 015's
Reel reads it with no copyright match. Reels uploaded in Development mode became public on their own, so none were
re-uploaded. Still to watch: plays in the next Audience report (Mon 9 Nov growth review).
