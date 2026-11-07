# Scheduled tasks: what runs when, and the exact instruction for each

Moved here from the cloud session on 3 Nov 2026 so the owner's Mac mini session can run them. Times are Singapore.
Each block is the full instruction to give a Claude session in this folder at that time. Set them up on the Mac so they
start on their own (see "Setting up on the Mac" at the end). Until the owner confirms the Mac runs them, the cloud
session keeps running its copies; it switches them off only when told, so nothing runs twice or not at all.

## 1. Morning post start: Mon-Fri 07:50, Sat-Sun 09:50

```
Start today's Football Stories 101 morning post (08:00 Singapore slot on weekdays, 10:00 at weekends). In this folder:
1. gh run list --workflow publish-daily.yml --limit 5. If a run from today is queued or in progress, do nothing more and say so in one line.
2. Otherwise run it ONCE: gh workflow run publish-daily.yml --ref main -f dry_run=false -f wait_for_slot=true. If that errors, list the runs again and retry only if no new run appeared. Never start two.
3. Confirm the run started (its id and start time). The run waits for the slot and posts Instagram and Threads (Facebook is pre-scheduled in Meta). No message to the owner unless something went wrong.
```

## 2. Delivery check: Mon-Fri 08:16, Sat-Sun 10:16

```
Daily delivery check for Football Stories 101. Follow docs/posting-format.md and CLAUDE.md.
1. git pull origin main. Find today's story (weekdays dated today 00:00 UTC, weekends 02:00 UTC) and read its records in data/sent.json. From 8 Nov 2026 every Reel must have narration and music sample 3 or 4: the Facebook record must name sports-documentary or cinematic-trailer, not a classical track. If it names a classical track, say so to the owner plainly.
2. Look at this morning's Publish daily runs: which started, when, and what it posted.
3. If Facebook, Instagram and Threads are all recorded: run check-facebook.yml with post_id reel:<id> from the Facebook record, read its log (publish_status published, no copyright match) and tell the owner in one line: "Story NNN live on all three at HH:MM". Nothing else.
4. If a network is missing: make sure no posting run is in progress (never start a second one), run post-social.yml once for that story with only the missing networks (dry_run false), confirm from the run log and data/sent.json, tell the owner exactly what failed, why and what you did, write it up in docs/incidents/, and fix the cause if it is in our code (npm run verify and the verifier subagent before pushing).
5. Never repost a network that is already recorded.
```

## 3. Weekly research: Thursday 08:52

```
Weekly research run for Football Stories 101. git pull origin main; read CLAUDE.md, docs/research/README.md, docs/story-bank.md (with "Rules for new angles"), docs/posting-format.md and the newest note in docs/research/. Research on the public web only (never log in): football history posts drawing attention this week, players and clubs fans are talking about, anniversaries in the next six weeks; for each comparison day in the next three weeks one or two candidate pairs of moments on that date with two sources each; two or three "Guess the legend" candidates; famous XIs worth a Legendary XI card; patterns with links and rough numbers. Never copy another account's post. Write docs/research/YYYY-MM-DD.md per the README, add at most 7 reserved regular-story angles to the story bank (rotation, no three in a row from one country, nothing repeated; a returning subject only as a marked follow-up). npm run verify with 0 errors, the verifier subagent on the new angles, commit "research: YYYY-MM-DD" and push. Finish with a short report to the owner: the three most useful findings, what was added, anything for their review.
```

## 4. Weekly drafting: Saturday 08:47

```
Weekly drafting run for Football Stories 101. git pull origin main; read CLAUDE.md (definition of done, "Never" list, picture standard) and docs/weekly-drafting.md, and follow it exactly, especially step 5a (the weekly mix). Make 7 new pieces in the owner's rhythm: an "on this day" comparison every third day, a "Guess the legend" quiz every ninth day, regular stories otherwise. npm run verify lists upcoming comparison and quiz days still holding a regular story: fill those for the next 14 days with npm run hand-over, then add regular stories (next reserved angles in docs/story-bank.md) at the end of the queue. Two independent sources per claim, verified quotes only, a fact-check log for each; one-name closing questions; famous-team stories get a Legendary XI lineup; topical tie-ins where honest. Pictures painted from real Commons photos with npm run paint:codex (Codex on the ChatGPT plan; the "Paint with GPT Image" workflow only if Codex cannot paint, docs/runbook.md section 13); open every painting and card at full size against the picture standard. Hand-overs of days Facebook already has scheduled: push, wait for the site's reel-stories.json to show the new slug, then Reels switch (dry run first) outside 06:00-10:45 Singapore and confirm with Check a Facebook post. npm run validate and verify with 0 errors, the verifier subagent on the week's pieces, commit "content: NNN to NNN" and push. Finish with a short report to the owner: seven headlines with dates and formats, anything cut in fact-checking, what the verifier found, and the editor's preview link https://immigrationlabsg.github.io/football-stories-101/preview/editors-desk/
```

## 5. Instagram link reminder: stopped (owner, 4 Nov 2026)

Stopped for good. Meta's business support told the owner on 4 Nov 2026 that his personal Facebook profile carries a
restriction from an old business portfolio that cannot be reversed, so he cannot connect Instagram to the Page. The owner
decided to stop trying ("a waste of time"). Posting does not need the link: Instagram posts through our own app. What the
page goes without: Meta's licensed music for Reels (we keep the four public-domain clips), the shared inbox and combined
insights in Business Suite. Never create a second Facebook profile for the owner to get round the restriction. If the
link is ever wanted again, the way is a trusted second Page admin with full control who connects Instagram from their own
profile. The Mac job was removed and the cloud routine is paused.

## 6. Weekly growth review: Monday 12:41

```
Weekly growth review for Football Stories 101. The owner's brief (27-30 Oct 2026): you are the CEO of this page and a legendary influencer; grow its reach and popularity and keep fans hooked on great football stories every day; document what went well. Standing instruction (30 Oct): "Always review on your own work and the results and research on other successful examples, and work on improving the results and testing on your own." Approval (30 Oct): "Ok try it and we'll measure the success. My only request is for the entire page to stay consistent in the way it's being presented eventually."
1. git pull. Read docs/growth-log.md first (brief, standing instruction, the four asks, benchmarks, research, the experiment calendar) and docs/posting-format.md "Experiments and the house look".
2. Run insights.yml (Audience report) and read its log, including skip rate and average watch per Instagram Reel (baseline 57.0%, 5.5 s: docs/growth-log.md, 5 Nov).
3. Review our own work: last week's Reels and captions against their numbers; best posts and why; split by format (regular, "on this day", quiz, Legendary XI); this week's test posts against the Facebook control and previous weeks.
4. Research at least two football history / nostalgia / trivia pages that out-perform us (public web, never log in); add a dated benchmark note. Never copy their posts or pictures.
5. Apply the four asks and write the answers briefly in the log.
6. Decide last week's experiment: keep or drop, with the numbers. A kept change becomes standard on every network (update posting-format.md; re-make and re-upload scheduled Facebook Reels one at a time, outside 06:00-10:45 Singapore); a dropped one is removed everywhere. Build this week's experiment from the calendar (Instagram and Threads only; Facebook the control; one change; the house look kept). Render it and look at it at full size; dry-run the posting first. Never ask for likes, shares or tags; never link the website; never use another account's or agency's pictures; never message other accounts. npm run verify (0 errors), the verifier subagent on any code or story change, commit and push; confirm real outcomes before reporting.
7. Send the owner 3-5 lines: headline numbers, last week's experiment result, this week's experiment, anything needing their OK.
```

## 7. Weekly ad hoc Reels: Sunday 14:07

```
Weekly ad hoc Reels for Football Stories 101 (owner, 7 Nov 2026: three narrated extra posts every week, Tue, Thu and Sun at 20:00 Singapore; owner, 8 Nov 2026: on Facebook, Instagram and Threads, each with narration and music sample 3 or 4). In this folder:
1. git pull. Read CLAUDE.md (the Never list), .claude/skills/narrated-reel/SKILL.md with its references, docs/picture-guide.md, the "Extra posts" part of docs/posting-format.md and the newest notes in docs/growth-log.md (what the last extras did).
2. Find three stories with the owner's steps: what is trending in football news this week; is there a rags to riches story in it (a club or person going from the bottom to the top); who is the key person behind it. One subject may be split over several posts or weeks. Attention test first (owner, 7 Nov 2026, rejecting a true but unknown story about Zidane's father: it "serves no purpose and attract nobody's attention"): start from what fans already care about and argue over, the famous moment, controversy or name, then give the angle they don't know. The famous thing is on screen in the first 3 seconds. Drop any story resting on a person nobody knows. In your report, say for each Reel why a fan would stop scrolling and send it to a friend. Shape: the recent trend first, then history people may not know, then a hook question. Every claim has two sources in docs/fact-checks/NNN.md; if a trend hook is not honest for the posting date, choose another story. Target the Tuesday, Thursday and Sunday of the next seven days, and only those with no extra story yet. If all three are taken, make nothing, say so in one line and stop. Number 908 and Sun 15 Nov 2026 belong to Zidane until his story is added. Use the lowest numbers from 906 up not taken by a story or a file in docs/fact-checks. Pick stories whose first frame can show an important, impactful event the world knows, and name that picture in the draft; if no free-licence photo of it exists, say so to the owner in the report rather than opening on a portrait.
3. Make each Reel with the skill, in ~/Developer/football-stories-samples/<slug>/: Commons photos under allowed licences, real kit with the maker and sponsor logos the photo shows, voice, captions, the page's ending card. Music is not generated: even story numbers use sample 3 (music-style-samples/raw/3-sports-documentary.mp3), odd numbers sample 4 (4-cinematic-trailer.mp3), as the skill's Music step says. Look at every painting and frame at full size. Run check_reel.py on each. Painting uses Codex on the ChatGPT plan. Stop and report if Higgsfield credits fall under 100; never buy credits.
4. Add each as a story (src/content/stories, extra: true, onlyOn facebook, instagram and threads, narratedReel assets/reels/NNN-<name>.mp4, reelCredits naming every photo's author and licence, date at 12:00Z on its day) with draft: true, plus the hero and data/reference-photos.json. Look at its cards at full size after npm run images.
5. npm run verify with 0 errors. Have a general-purpose subagent that did not make them check each Reel against the skill's standards and each claim against its sources, opening the pages; fix what it finds and recheck. Then commit and push, with draft: true still on.
6. Report to the owner: for each Reel the path of the mp4, the script, the news hook with its source, the caption, what was not verified (nobody can hear it here), credits left. Say that the Reels post only after the owner says OK, and that the committed drafts are visible in the public repository meanwhile: on their OK a session sets draft: false and pushes before the slot, and workflow "Post extras" posts them.
```

## 8. Daily narration batch: every day 09:00

```
Daily narration batch for Football Stories 101 (owner, 8 Nov 2026: every Reel has narration and music sample 3 or 4 rotating, on Facebook, Instagram and Threads; "every day at 9am, just do 5 more again, until all are changed"). In this folder:
1. git pull. Read CLAUDE.md (the Never list) and the "Narrated Reels" part of docs/posting-format.md. Run npm run narration -- status. If nothing is left, say so in one line and stop.
2. Run npm run narration -- plan 5. It prints each story's spoken lines, which are the cards' own text. Read every line as a voice would say it. You may change how a line is written in its lines.json so it is said correctly (a score, a season, a name's spelling), never what it says: no added, cut or changed fact. If a card's text cannot be read aloud sensibly, leave that story out and report it.
3. Check Higgsfield's balance. If it is under 100 credits, stop and tell the owner; never buy credits. Make each line with generate_audio: model text2speech_v2, variant elevenlabs, voice_type preset, voice_id from lines.json, about 6 jobs at a time (a 429 refusal means fewer, wait, then resend only those). Download each result to assets/narration/NNN/<line number>.mp3. Never send anything to earshot's llm command.
4. For each story run npm run narration -- test NNN <a temporary folder> and check the file with ffmpeg and ~/Developer/football-stories-samples/.venv/bin/python -I: every clip's words against its line by transcript, loudness about -14 LUFS, true peak under -1 dB, length under the track's limit, and look at frames as each line starts to see that its card is the one on screen. A story that fails: make the voice again or leave it out and report it. A name the transcriber mishears needs saying in the report, not a guess.
5. npm run validate and npm run verify with 0 errors. Have a general-purpose subagent that did not do the work check the batch the same way, tracing it end to end; fix what it finds and recheck. Tell it not to report anything as blocked until it has tried every allowed route.
6. Commit "narration: NNN to NNN" and push. Confirm the "Build and deploy" run succeeded and that /images/derived/reel-music.json on the site names each new story with its right track. Facebook's scheduled Reels are replaced by task 9 at 11:05, because the repository forbids that between 06:00 and 10:45.
7. Report to the owner in 3-5 lines: which stories were done, which music each has, credits left, anything not verified (nobody can hear it here), how many are left.
```

## 9. Facebook swap for the narrated batch: every day 11:05

```
Facebook swap for Football Stories 101 (owner, 8 Nov 2026: Facebook, Instagram and Threads all get the narrated Reel). This runs after task 8 because scripts/reels.ts forbids Facebook changes between 06:00 and 10:45 Singapore. In this folder:
1. git pull. List upcoming stories that have a complete voice in assets/narration (npm run narration -- status counts them) and whose Facebook record in data/sent.json is missing or does not name sports-documentary or cinematic-trailer. If none, say so in one line and stop. If today's Build and deploy run is not finished, wait for it, and compare /images/derived/reels.json with the voices before starting.
2. Soonest first, at most 5 a day, and one at a time: gh workflow run reels.yml -f action=replace -f from=N -f dry_run=false, and wait for it to finish before starting the next. Never start two together: Meta's anti-spam stopped a bulk run on 24 Oct. If Meta refuses with a limit, stop for today and report; the next run continues. A story with no Facebook record yet gets action=switch with from=N and to=N in the same way.
3. git pull and read each story's new record. It must name the new track. If a record says UNCONFIRMED, run action=confirm for that story once Meta has had time, and read the result. Never upload a story again while it is UNCONFIRMED.
4. Check one of them with the Check a Facebook post workflow (check-facebook.yml, post_id reel:<id>): scheduled, no copyright match.
5. Report in 1-3 lines: which were swapped, and anything still waiting. Say nothing more if all went well.
```

## Setting up on the Mac

**Running on the Mac since 4 Nov 2026, 00:50 Singapore.** The cloud session was deleted by the owner and its eight Football
Stories routines in claude.ai were paused (not deleted) the same night; the Mac's switch file is on. Setup: see `ops/mac/README.md` (launchd jobs, logs, the keep-awake job, and the switch that keeps the
Mac's copies off until the cloud session's copies are switched off, so nothing runs twice or not at all).
