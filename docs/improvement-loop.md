# The improvement loop: test, measure, check, keep, repeat

Owner's request, 9 Nov 2026: a plan, based on the research, for (1) what to try to improve results, (2) how to measure
whether it worked on likes, shares and followers, (3) a verifier agent that makes sure every job is done properly and
not lazily, and (4) a loop that reviews what worked, keeps it, adds the next improvement, and repeats. The master session
runs the agents and picks the model and effort for each job.

Status: **approved by the owner on 9 Nov 2026.** Nothing here changes a post before the 10-day trial ends on 17 Nov.

Owner's decisions, 9 Nov 2026: (1) "Approve" the plan; (2) "Yes agree" to measuring tests 1, 2 and 4 before against
after, without Facebook as a control; (3) "Yes" to the Threads text takes (test 3) and the Boxing Day countdown (test 4);
(4) "On top of YouTube, I want to start TikTok too. Can you setup YouTube on your own end and start it."; (5) "Allow"
replies on other accounts' Threads posts.

**Words used here**
- **Reach**: how many different people saw a post. **Plays/views**: how many times it was watched.
- **Skip rate**: the share of Instagram viewers who swipe away in the first seconds (lower is better).
- **Shares per 1,000 reached**: shares ÷ reach × 1,000, so posts with different reach can be compared.
- **Test week**: Monday to Sunday, one change only. **Register**: a file listing each test and its posts.
  **Scoreboard**: a script that adds up the numbers from saved snapshots, so nobody adds by hand.

---

## 1. What counts as better

Three numbers, as the owner set them (8 Nov): **likes, shares, followers.** Views are the result we want them to lead to.

| Score | How it is counted | Read from |
|---|---|---|
| Likes per post | Instagram likes + Facebook reactions + Threads likes, scored at **48 hours** | Audience report (all three networks) |
| Shares | per network: Instagram shares per 1,000 reached; Facebook Reel shares per 1,000 plays (Meta no longer gives Facebook reach); Threads reposts + shares per 1,000 views | Audience report |
| Followers | the change in each network's follower count, week by week, and as a **4-week trend** | account counts in the Audience report |

Early signs, used to explain the scores, never to decide alone: reach, skip rate, average watch time.

**Honest limits.** Numbers are tiny today (followers: Facebook 1, Instagram 0, Threads 0 on 9 Nov; 0 shares on every
post). One friend's share can swing a week. So:
- followers are judged on the 4-week trend, never on one test week;
- a test is decided on likes and shares together, on the 7 daily posts of its week;
- because shares start from 0, a share bar always needs **at least 3 shares from at least 2 different posts** in the
  week, so one friend's share can't decide a test;
- per-post follows can't be read (Meta doesn't give Instagram Reel follows to our app), only account totals.

**Which posts count in a test:** all 7 daily posts at 08:00 (10:00 at weekends), whatever their format (regular story,
"on this day" comparison, quiz, Legendary XI). The test's change applies to every one of them, and the scoreboard also
shows the split by format. The 20:00 extras don't count: they're a separate series with their own review.

**48 hours:** a post's numbers keep growing for a day or two, so every post is scored at the same age. The daily
snapshot runs at 13:00 SGT; each post is scored from the first snapshot at least 48 h after it went out (about 53 h for a
weekday post, 51 h for a weekend one). The same rule applies to every post, so the comparison stays fair.

**Baseline:** the trial's daily posts of 8-16 Nov (9 posts), set in the trial report on 18 Nov. The daily snapshot
doesn't exist yet, so these posts are read on 18 Nov at whatever age they are then (2 to 10 days), not at exactly 48 h.
Older posts have had more time to collect likes, so this baseline is, if anything, generous, which makes the tests
harder to pass, not easier. From test 1 on, every post is scored at 48 h. The 17 Nov post is too young and isn't part of it.
For reference, the best trial post so far, 021 Denmark 1992, had reach 305, 38% skip and 75% watched, but that was read
only 4.7 h after posting, so it isn't a 48 h score.

## 2. What we will try, in order

One change at a time, one test week each, so we know which change did what. Ranked by the research (docs/growth-log.md,
"Research on other pages, round 1") and by our own best post. Each idea's evidence is labelled with its strength.

| # | Test week | Change | Evidence (and its limits) | Keep it if, against the baseline |
|---|---|---|---|---|
| 1 | 23-29 Nov | **Story pick by feeling.** Every daily post (stories, comparisons, quiz) chosen for awe, outrage or an absurd paradox, with a name fans know. The writer tags each story's feeling. | Peer-reviewed study (Berger & Milkman 2012): awe and anger spread most, sadness least. It studied emailed New York Times articles, not Reels. Our own 021 (an underdog paradox) and Sporty2D's best ("149-0") point the same way. | likes per post **+30%**, and at least 3 shares from 2 or more posts, with shares per 1,000 above the baseline |
| 2 | 30 Nov-6 Dec | **First 3 seconds.** Test 1's change stays in, per the lag rule (section 3), unless it's dropped on 2 Dec. Rotate the opening line by day: a true "most/only" fact, the result first, or a question (2-3 days each). | Instagram's own advice: hook in the first 3 seconds (platform). | skip rate **down 5 points** and likes per post **+20%** vs the week before. Then the best opening type becomes standard. |
| 3 | 7-13 Dec | **Threads only: one short text take a day** on that day's football news, one topic tag, each with a fact-check entry; card posts continue. **Needs the owner's OK** (the page's "consistent look" order). | Meta's own Threads tips (platform). No numbers. | at least 5 Threads likes + reposts in the week (trial: 0) and Threads views per post above the trial's median; followers reported, judged on the 4-week trend |
| 4 | 17-26 Dec (a 10-day series, the one exception to Monday-Sunday) | **Countdown to Boxing Day: "Day 1/10" to "Day 10/10"** on the 10 daily stories. Comparisons and the quiz pause for those 10 days. **Needs the owner's OK** (it changes the rhythm). | One TikTok page's World Cup countdown: 35.6K-543.6K views up to Day 11, then 0.4-3.8M. One page only, with a presenter on camera, and the rise can't be separated from the World Cup getting closer. | likes per post **+30%** against the 10 days before, and at least 3 shares from 2 or more posts; followers reported, judged on the 4-week trend |
| 5 | Jan | **Re-test the best kept change** against the newest idea from the weekly research | Stops us keeping something that only worked once. | set in the register before the week starts |

14-16 Dec: no test (buffer before the countdown).

**Facebook as a control.** `docs/posting-format.md` says tests run on Instagram or Threads only, with Facebook unchanged.
Tests 1, 2 and 4 change the story or the Reel itself, which is the same file on all three networks since the owner's
8 Nov narration order. A Facebook-only control isn't possible for them, so they're measured before against after (each
test week against the baseline and the week before). This changes the posting-format rule and **needs the owner's OK**.
Test 3 keeps Facebook and Instagram as controls.

**Lead time.** Stories are written 3-4 weeks ahead. Test 1 applies to stories 035-041 (23-29 Nov), which still have to
be built (032-047 are waiting), so the feeling pick and scripts are done at build time. Any story re-picked for a day
Facebook already has scheduled goes through the usual owner approval and the Facebook swap.

Parked until there is evidence or the owner decides:
- **YouTube Shorts as a fourth channel** (owner's call: a new account). The 9 Nov benchmark: Sporty2D, a 1-week-old
  Shorts page of 2D cartoons, got 59K and 55K views on its two football Shorts (its other sports 0.9K-8K), while the
  same videos on its Instagram had 6 followers. Worth a test; one page is not proof.
- **Replying on other accounts' Threads posts.** Meta suggests it; the owner's rule forbids messaging other accounts.
  Needs the owner's ruling.
- **Instagram library music**: only if Meta's posting API can attach it. Check first.
- **Length**: our 45 s already sits in Instagram's suggested 30-60 s. No test.

Rules every test keeps: the voiced, painted house look; no asking for likes, shares or follows; no website link; no
messaging other accounts; paintings only from real photos; every fact checked; no Facebook changes from 06:00 to 10:45 SGT.

## 3. How we measure

1. **Daily snapshot (new).** A GitHub workflow at 13:00 SGT runs the existing Audience report with a new option that also
   writes the numbers as `data/metrics/YYYY-MM-DD.json`, and commits that one file (the workflow needs write permission
   for that). It reads Meta exactly as today and posts nothing. The report lists only the last 15 posts per
   network (on Threads, cards and Reel replies together, so about a week), so a missed day must be caught up the next
   day. The Monday review checks that no day is missing, and a failed run shows as a failed GitHub run and a Mac
   notification.
2. **Register (new).** `data/experiments.json`: each test's name, dates, the change, the counted stories, and its bar.
   Each story file gets a `feeling` tag and, during test 2, an `opening` tag.
3. **Scoreboard (new script, `npm run scoreboard`).** Reads the snapshots and the register, scores every counted post at
   48 h, and prints one table per test: each score against the baseline and the week before, per network.
4. **Decision, every Wednesday** (Sunday's post turned 48 h old on Tuesday, so the 13:00 snapshot has all 7).
   **One-week lag, on purpose:** because posts need 48 h, a test is decided on the Wednesday after it ends, while the
   next test is already running. Stories are built weeks ahead, so the next test is always set in the register before
   its week starts, assuming the earlier change stays. If the Wednesday decision drops a change, it comes out of every
   story built from then on, and the running test is scored against the same mix. Kept if it clears its bar and the early signs move the
   same way. Dropped if it misses on both likes and shares. Anything in between: extended one more week once (the
   queue moves back one week), then dropped if still unclear. A single post with more than 3 times the median is reported but doesn't decide a test alone.

## 4. Who does what (agents, models, effort)

The master session (this one, Opus 5.5) plans, starts the agents, reads every verifier verdict and reports to the owner.
Each role gets its own agent file in `.claude/agents/` (built in section 7) so it works the same way every week.

| Job | Agent | Model / effort | Why |
|---|---|---|---|
| Weekly research on other pages | researcher | Sonnet 5.5, medium | reading and noting; speed matters |
| Pick stories and write scripts | writer | Opus 5.5, high | judgement on what fans will feel, and the voice |
| Fact-check every claim (two sources) | fact-checker | Sonnet 5.5, high | careful but routine; never the writer |
| **Paintings** | art director, driving Codex GPT Image on the ChatGPT plan | Opus 5.5, high; up to 4 painting tries per picture, every try logged | the owner said go all out on images: it opens each try at full size and sends weak ones back |
| Build the Reel (voice, music, captions) | builder | Sonnet 5.5, medium | follows the scripted recipe |
| Snapshot and scoreboard | analyst | Sonnet 5.5, low | runs scripts and reads tables |
| Facebook swaps, delivery checks | ops | Sonnet 5.5, low | fixed commands only |
| **Check every job** | **growth-verifier** | **Opus 5.5, high** | the last line of defence; never the agent that did the work |

## 5. The verifier: stopping lazy work

Defined in `.claude/agents/growth-verifier.md`. It works alongside the existing `verifier` (code and posting checks).

How it stops lazy work:
1. **Proof or it didn't happen.** Every claim in a worker's report ("posted", "fact-checked", "matches") must come with
   the file, log line, record or picture that shows it. The verifier opens each one itself. A claim with no proof fails.
2. **Redo, don't re-read.** It reruns the numbers from the raw snapshots, matches every claim in a script to the
   fact-check log, re-opens the sources for a random third (at least 3 per story), and pulls frames from every Reel to
   look at them at full size.
3. **A checklist for each kind of job:** test set-up, research, story, painting, Reel, measurement, ops. Every item is
   marked done or failed with its proof. No item can be skipped.
4. **It looks for the silent shortcuts:** a fact dropped without saying so, a fact added without a check, an "about"
   number with no source, a painting accepted with no logged tries, a test week that changed two things, a report that
   says "verified" without saying how.
5. **It says what it could not check** (for example, how the music sounds: it can read the track name and the levels,
   but the owner's ear decides). Unchecked is never reported as passed.
6. **Verdict: PASS or FAIL** with numbered findings. A FAIL goes back to the worker with the findings; after three
   rounds, the master steps in.
7. **Checking the checker.** Every two weeks the master puts one known mistake into a practice copy (a wrong date, a
   cut-off head) and confirms the verifier catches it. Every week the master re-checks one random verifier PASS.

## 6. The loop, every week

| When (SGT) | Step | Who |
|---|---|---|
| Daily 11:10 | Facebook Reel swaps where needed (desktop scheduled task `fs101-swap-reel-031`, daily at 11:10 despite its name; it replaces the 11:05 Mac job, which is off) | ops |
| Daily 13:00 | Snapshot the numbers | analyst (workflow) |
| Monday | Weekly growth review (the existing task, rewritten): last week's numbers, two pages that beat us | analyst, researcher → growth-verifier |
| **Wednesday** | **Decision:** score last week's test; keep or drop; confirm the register entry for the test after the running one; update the "what works" list | analyst → master → growth-verifier |
| Wednesday | 3-5 lines to the owner: the numbers, keep or drop, next test, anything needing their OK | master |
| Thursday | Research run; new ideas join the queue | researcher → growth-verifier |
| Weekly drafting run | Write, fact-check, paint and build the coming stories to fit the test of their week | writer, fact-checker, art director, builder → growth-verifier |

Already scheduled and kept: the extras review on 16 Nov, research on 12 and 16 Nov, the trial report on 18 Nov.

**Keeping what works:** a kept change goes into `docs/posting-format.md` and onto a short "what works" list in the growth
log. From then on it is the new normal, and the next test is measured against it. A dropped change is removed everywhere.
Every four weeks the master sends a one-page summary: what was kept, what was dropped, and the 4-week trend in likes,
shares and followers since 8 Nov. Then the loop repeats with the next idea in the queue.

## 7. What gets built now, before 18 Nov (no posting changes)

1. Agent files: `growth-verifier` (drafted), plus researcher, writer, fact-checker, art director, builder, analyst, ops.
   The art director writes a painting log per story (`qa/paint-log.md` in the build folder: each try's prompt, source
   photo and result) so the verifier can check the tries.
2. The snapshot option in `scripts/insights.ts`, the daily snapshot workflow, `data/experiments.json` and
   `npm run scoreboard`, checked by the verifier against a live Audience report.
3. The weekly review task (`docs/scheduled-tasks.md` task 6) rewritten to follow sections 1-6, including the Facebook
   control change once the owner agrees.
4. 18-19 Nov: the trial report and the locked baseline. 23 Nov: test 1 starts.

## 8. What needs the owner

- OK on this plan and the order of the tests, including measuring tests 1, 2 and 4 before against after (no Facebook control).
- Yes or no: Threads text takes (test 3) and the Boxing Day countdown (test 4).
- Yes or no on YouTube Shorts as a fourth channel.
- A ruling on replying to other accounts' Threads posts.
