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
- **Replying on other accounts' Threads posts: allowed** (owner, 9 Nov: "Allow"). Genuine, on-topic public replies only,
  never asking for likes, shares or follows. To be added as a Threads idea after test 3.
- **Instagram library music**: only if Meta's posting API can attach it. Check first.
- **Length**: our 45 s already sits in Instagram's suggested 30-60 s. No test.

Rules every test keeps: the voiced, painted house look; no asking for likes, shares or follows; no website link; no
direct messages to other accounts (genuine public Threads replies are allowed); paintings only from real photos; every fact checked; no Facebook changes from 06:00 to 10:45 SGT.

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
| 8th, 18th, 28th | **10-day factor review** (section 9): backfill the factor sheet, line factors up against 48 h outcomes per network, keep / test / drop | analyst → master → growth-verifier |
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
- ~~YouTube Shorts~~: started 9 Nov (@foot.ballstories101). TikTok: waits on the owner creating the account.
- ~~A ruling on replying to other accounts' Threads posts~~: allowed, 9 Nov.

## 9. Success factors: track every post, review every 10 days (owner, 9 Nov 2026)

Owner: "We need to identify the key factors and keep it, while continuing to improve on it every 10 days... keep it in the sop that we will need to track all these data and factors for success, so that we can improve on the results methodically."

**Why:** on 9 Nov the same Reel (021 Denmark 1992) reached 1,083 accounts on Instagram (25 shares, 22.9 s average watch, 34.8% skip), got 436 views in 3 hours on YouTube, and got 0 plays and 0 shares on Facebook. Story 020, built the same way the day before, reached 118 on Instagram. So the format alone doesn't explain results: the story, the hook and each network's rules all matter, and we can only tell them apart if every post's ingredients are written down.

1. **Factor sheet, every post (`data/post-factors.json`).** The analyst fills one entry per story, at the latest at the next 10-day review (the review task backfills any missing post first), from the story file, build log and sent records. Fields:
   - **Story:** pillar, themes, feeling (awe / outrage / paradox / other), story shape (underdog, record, tragedy, two-date pair, quiz, era), world-known event yes/no, famous names, a date tie (anniversary or last night's match).
   - **Hook:** the first on-screen line, its type (paradox, question, number, name), and whether a famous name is in it.
   - **First frame:** what it shows (the event moment, a portrait or a collage).
   - **Format:** length in seconds, voice, music track, number of paintings, ending question.
   - **Posting:** date, weekday, SGT time per network, how it was posted (API scheduled, API direct, Studio by hand).
   - **Caption:** first words and length.
2. **Outcomes stay where they are.** Numbers come from the daily snapshots (`data/metrics/`) and YouTube Studio, scored at 48 h, never typed into the factor sheet. Read YouTube from Studio in Chrome on the FS101 account: views, average percentage viewed, likes, subscribers and, once shown, viewed vs swiped away. Facebook's reach metric currently errors in the API (`post_impressions_unique`), so Facebook plays are the measure until that is fixed.
3. **Every 10 days: factor review.** It falls on 18 Nov (with the trial report), then 28 Nov, 8 Dec, 18 Dec and so on. The analyst lines up the last 10 posts' factors against their 48 h outcomes per network and lists:
   - which factors the top 3 posts share and the bottom 3 lack;
   - what differs between networks;
   - any single post more than 3 times the median, reported but never the only proof.

   The master proposes keep / test / drop, and the growth-verifier checks every number against the snapshots.
4. **Keep, test, improve.** A factor that shows up in the top posts in two reviews in a row becomes a hypothesis for the weekly test queue (section 2), and is kept only if its test clears the bar (section 3). The weekly tests and Wednesday decisions keep running; the 10-day review feeds them and records what to keep.
5. **Network differences get their own line in each review.** Instagram shows each Reel to a test group of non-followers first (all of our Instagram reach so far is non-followers), so a strong story can break out from zero followers. Facebook gave our Page's Reels between 0 and 253 plays with 1 follower, so on Facebook we watch for anything that lifts plays (posting time, posting directly instead of scheduled, captions, the first 3 seconds) as separate tests. Testing on Facebook changes the rule that Facebook stays unchanged as the control (section 2, `docs/posting-format.md`), so each Facebook test needs the owner's OK first, and nothing changes on Facebook between 06:00 and 10:45 SGT.
6. **Scheduled:** the 18 Nov review runs inside the trial report task; later reviews run from the desktop task `fs101-factor-review` on the 28th, 8th and 18th of each month at 12:41 SGT (about every 10 days). Its text is in `ops/tasks/fs101-factor-review.md`. Created 9 Nov on the owner's say-so; its 18 Nov run stops at once because that review is in the trial report.
7. **Not built yet:** a script that joins the factor sheet to the snapshots for the review table. Until it exists, the analyst builds the table by hand from both files, and the verifier recomputes it.


## 10. Adam Mosseri's guidance, and what it changes for us (owner, 9 Nov 2026)

Owner: "Understand what he said, and take what he said as serious context to how we strategize on our reels and growing our account."

**Source:** Colin and Samir's interview with Adam Mosseri, head of Instagram, published 26 Oct 2026. It is on Instagram (https://www.instagram.com/p/De8mKLVCW8X/) and YouTube (https://www.youtube.com/watch?v=sxizdQ2hRfk, 71:39). Also used: Mosseri's 6 Nov post on the cleaned-up Insights, and Instagram's Original Content Guidelines, linked from his profile (https://creators.instagram.com/original-content-guidelines). Wording comes from YouTube's auto-captions, read 9 Nov, so quotes are close, not word-perfect. An independent check re-read the key quotes from the video on 9 Nov and confirmed them; some smaller notes (the DM, Subway Takes and survey lines) were not re-checked. Full notes are in `docs/growth-log.md` under "Mosseri interview notes, 9 Nov 2026".

**What he said that matters to us**

| # | Mosseri | What it means for FS101 |
|---|---|---|
| 1 | Reaching people who don't follow you ("unconnected reach") is driven by **sends per reach**. For a new creator, "one of the most important metrics you could follow" is sends per reach, then likes per reach, then watch time (the order is confirmed by a second source; in the captions part of it may be the host speaking). Edits now does this maths, and it is coming to Insights. | Every one of our Instagram viewers is a non-follower, so sends per reach is our main Instagram number. 021 got 25 shares on 1,083 reached (2.3%); earlier Reels got 0. |
| 2 | Shows that work are "ready to engage with immediately": "it reminds you of a friend" and "you immediately want to send it". | Pick and write every story so a fan thinks of a specific friend, club rival or argument ("send this to your Arsenal mate"). We still never ask for a share. The story must make people want to send it. |
| 3 | Ranking isn't only engagement. **Originality** (original creators get more distribution than aggregators), **breakouts** (every post gets a chance; "a brand new account can get millions of views, which was impossible 2 years ago") and **recency** ("ebb and flow with what's happening in the world right now"). | Keep our own paintings, script and voice: this is our edge. Tie stories to what football is talking about this week: last night's match, an anniversary, a record just broken. |
| 4 | Instagram leans on watch time less than its competitors. It looks at "how likely you are to watch most of the video", plus sends, comments and likes. | Aim for viewers finishing the Reel, not for longer Reels. Keep about 45 s; watch completion (021: 22.9 s of 45 s). |
| 5 | The hosts see unusually high engagement on carousels. Mosseri gave the reasons: with music they can show in the Reels viewer; they get a "second chance" (shown again if skipped); and their depth drives sends. | A painted carousel with music is worth testing on Instagram. |
| 6 | Be clear about who you are and what your goal is, and pick only the tools that fit. "You don't have to use all of the formats." | Stay one focused account: true football stories. No off-topic posts. |
| 7 | AI content isn't ranked differently, but AI accounts and AI-generated characters (not illustrated pages like ours) must now label themselves, and Instagram is still learning to rank new kinds of AI content (it uses "worth your time" surveys). Originality is the principle. | Keep "Illustrations made with AI." on every post: our own honesty choice, not something Instagram now requires of us. Check whether the posting API can set Instagram's AI label. Never reuse other creators' scripts. |
| 8 | "What works today might not work in 6 months." He reinvented the same idea (a creator spotlight) three or four times in 7 years, while his weekly AMA has worked unchanged for 7-8 years. | Expect a format to fade. The 10-day factor review (section 9) watches for decline, and we change the format, not the mission. |
| 9 | Instagram checks what share of your followers you reach, so a follower count "means something", and it uses each viewer's history to predict who comes back. | Followers come from people who keep seeing and liking us. A steady daily series and recognisable look help returning viewers. |

Original Content Guidelines: narration, a storyline or creative graphics that re-contextualise count as original. Borders, watermarks, speed changes or only crediting do not. An account that mostly posts unoriginal content isn't recommended to non-followers until a "significant percentage" of its last 30 days is original. Our voiced, painted stories fit. Our 20:00 extras must keep the same standard.

**What changes now (no test needed, within the standing rules)**
1. **Instagram's headline numbers become sends per reach, then likes per reach, then watch time / skip rate**, in that order, in every review, scoreboard and report. Shares per 1,000 reached (section 1) already is sends per reach; likes per 1,000 reached is added beside likes per post.
2. **Sendability check at the writing stage.** The writer adds one line to each story's plan: who would a fan send this to, and why. The fact-checker and verifier treat a story with no clear answer as weak. This changes no rule: we still never ask for shares.
3. **Recency first when picking stories.** When two stories are equally good, pick the one tied to this week's football. A recency story still needs the full fact-check: never rush breaking news. Research round 2 lists the open dates (22, 25 and 30 Nov).
4. **Account Status check, monthly**, in the Instagram app (Settings, Account Status), to confirm our posts can still be recommended. The 28th factor review asks the owner to look, or reads it in the signed-in Chrome if Instagram shows it on the web.
5. **Factor sheet** (section 9): new fields `sendable_to` (who a fan would send it to) and `recency_tie` (what this week's football it hooks to).

**New tests for the queue (owner to choose the order; one change a week, as always)**
- **Recency week:** every daily story hooked to that week's football (last night's match, an anniversary, a record). Bar: Instagram sends per reach above the baseline, with at least 3 shares from 2 or more posts.
- **Carousel week (Instagram only):** each day's story also posted as a painted carousel with music. Bar: carousel sends per reach against the same day's Reel. Facebook and Threads unchanged.

Test 1 (story pick by feeling, 23-29 Nov) already picks for awe, outrage and paradox. The sendability check is part of the same pick, so test 1 still changes one thing.

## 11. Decision panel: 5 independent voters (owner, 9 Nov 2026)

Owner: "Based on your verifier / panel voters, which will you pick? If you did not come up with a panel voter, then start coming up with it. Base off the decisions of voting on whatever factors you mentioned earlier."

**How it works.** For any choice between tests or strategies, the master sends 5 independent agents (Sonnet, quick) the same brief and the same files, each with a different lens:
1. growth and sends;
2. measurement skeptic;
3. brand and rules guardian;
4. production and operations;
5. the fan.

Each scores every option 1-5 on the same six factors:
1. Mosseri's guidance supports it.
2. Our own data supports it.
3. Likely effect on sends per reach.
4. Can be measured cleanly.
5. Cost and risk.
6. Fit with the standing rules and the consistent look.

Each gives a total, a vote, and the condition that would flip it. The majority decides. The master checks every flip condition against the facts before acting, and the growth-verifier checks any fact the decision rests on. The owner can overrule.

**First vote, 9 Nov 2026: which new test runs first after the Boxing Day countdown?**

| Voter lens | Recency | Carousel | Vote | Would flip if |
|---|---|---|---|---|
| Growth and sends | 22 | 15 | Recency | Meta's API officially supports carousel music |
| Measurement skeptic | 19 | 19 | Carousel (tie broken for its built-in control) | the API can't attach music to carousels |
| Brand and rules | 20 | 17 | Recency | music can be attached to carousels of approved paintings |
| Production and operations | 21 | 16 | Recency | a carousel with music can be scheduled with no daily hand work |
| Fan | 22 | 17 | Recency | the API can attach library music to carousels |
| **Total** | **104** | **84** | **4 to 1 for recency** | |

Decision: **recency week first.** Two voters checked our code and Meta's documentation: our posting code already posts image carousels, but Meta's API attaches audio to Reels only, not carousels. That meets the carousel voter's own flip condition, so the result is effectively unanimous. The carousel test is parked until there is a way to attach music without hand work, because Mosseri's main reason for carousels (showing in the Reels viewer) needs music.

Guardrails the voters set for the recency week:
- Most hooks are planned ahead: anniversaries and records already verified, which suits our 3-4 week lead.
- "Last night's match" stories only after the full fact-check, with a hard cut-off, and never touching Facebook 06:00-10:45 SGT.
- Paintings only from real photos of the moment, as always.
- It's scored before against after (no control), so it needs at least 3 shares from 2 or more posts, and one big post doesn't decide it.
