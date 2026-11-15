# Evaluators: is this Reel good enough to post?

The owner asked for this on 16 Nov 2026: "come up with evaluators that judge whether the quality of the work done is good enough to meet our standards without compromising, and eventually have the ability to self improve on the entire system."

The `reel-evaluator` agent (`.claude/agents/reel-evaluator.md`) runs the gates below. It never judges its own work and is never the agent that built the Reel. A score is a judgement with evidence: each score cites the line, frame, source or number it rests on. A gate fails if any **hard rule** fails or the total is under its **bar**. Nothing goes to the owner as "ready" with a failed gate. A failed gate is fixed, or reported as failed with what's missing.

The owner is the final judge. The evaluator filters out weak work before it reaches them; it never replaces their OK.

## Gate 1: Pitch (before any script or build)

| # | Criterion | 0 | 1 | 2 |
|---|---|---|---|---|
| P1 | "No way" test: would a fan who knows the person still be surprised? | Everyone knows it ("ok, so what?") | Mildly new | A fan says "no way" and sends it on |
| P2 | A famous name or moment people already care about | Unknown person | Known in one country | Global name or moment |
| P3 | A setback-to-triumph arc, or a contradiction | None | Partial | Clear arc (red card at 18 → world champion) |
| P4 | A debate question people will argue about | Yes/no trivia | Opinion question | Invites people to name their own case, or settles an argument |
| P5 | The hook fact is checked in 2 outlets | No | 1 | 2+ |

**Hard rules:** no invented facts; the hook fact is true.
**Bar:** 8 of 10, with P1 at 2.

## Gate 2: Script (before any voice or video; the owner OKs after it passes)

| # | Criterion | 0 | 1 | 2 |
|---|---|---|---|---|
| S1 | Line 0: a single shock fact, stated plainly, one figure only | Describes the story ("The man who...") | Fact, but cluttered | One hard fact ("…red card after 47 seconds?") |
| S2 | Line 1 goes straight into the moment | Build-up first | Within line 2 | Line 1 |
| S3 | One thread, no detours (every line serves it) | 2+ side lines | 1 side line | None (no Mourinho-style colour) |
| S4 | The middle holds facts most fans don't know | Retelling | 1 to 2 new facts | 3+ sourced lesser-known facts |
| S5 | A late payoff that ties back to the hook | None | Generic | Ties back ("Not bad for a career that began with a red card") |
| S6 | Everything the hook promises is told | Missing | Partly | All told |
| S7 | Length | Outside 110 to 180 words | Fits only with a music loop | 120 to 160 words, under `end_src` |

**Hard rules:**
- Every line has a fact-check row with two sources, or "reportedly" for a single source.
- Exact quotes go in quote marks only when verbatim.
- Nothing asks for likes, shares or follows.
- The `hook` and `question` fields match lines 0 and the last line.

**Bar:** 12 of 14, with S1 and S3 at 2.

## Gate 3: Final cut (before the owner sees it as "ready", and again before install)

| # | Criterion | 0 | 1 | 2 |
|---|---|---|---|---|
| F1 | Frame 0: the whole hook over the person or moment it names | Part of the hook / wrong picture | Hook whole, weak picture | Hook whole over the moment |
| F2 | Pace (908-v5): a new shot every 1.5 to 3.5 s, none over 6 s | Static stretches | Mostly | Throughout |
| F3 | Pictures: each line's picture shows what's said | Mismatches | Mostly | Every line |
| F4 | Chips and captions: inside boxes, clear of faces, matching the voice word for word | Overflow or mismatch | Minor | Clean |
| F5 | Sound: `check_reel.py` loudness, peak, voice over music; no jump at a loop | A fail | Pass with a note | All pass |
| F6 | Names heard right, or flagged for the owner's ear | Wrong | Unsure, flagged | Right |
| F7 | Page and caption tell the same story, nothing stronger than the sources | Different or overstated | Minor | Same story |

**Hard rules:**
- Paintings only from real photos, with real logos only.
- The page's ending card holds 4 s.
- `reelCredits` is under 200 characters and names every Commons author.
- `npm run verify` shows no new error.
- The script is word for word as the owner approved it.

**Bar:** 12 of 14, with F1 and F4 at 2.

## Self-improvement loop (outcomes calibrate the evaluator)

1. **Log every score.** Append each gate result to `data/eval-log.json`: story number, gate, scores per criterion, total, pass or fail, date, and the owner's verdict (approved, or changes asked and what they were).
2. **Log outcomes.** At 48 hours, add the outcome per network from the metrics snapshots and `live.json`: views, likes, shares in the first ~120 views, and saves.
3. **Calibrate weekly** (the Monday growth review, task 6a) and at each 10-day review. Compare scores with outcomes and with the owner's verdicts:
   - **A criterion that high scorers pass but which doesn't track shares** is a candidate to lower or drop.
   - **The owner rejected something the evaluator passed** (e.g. "ok, so what?" on Messi v5, Mourinho as colour): add or sharpen a criterion so that miss is caught next time.
   - **A post with high shares** (Zidane 908-v5, Denmark 021): list what it had that the rubric doesn't measure, and propose a new criterion.
4. **Propose, then change.** The evaluator writes the proposed rubric changes, with evidence, into the review report. The owner confirms each one before it becomes a rule (owner, 11 Nov: confirm before adding Reel rules). Then this file, `story-development.md` and `lessons.md` are updated, and the old version of each changed rule is deleted.
5. **Keep score of the evaluator itself.** Track how often an owner rejection was a gate the evaluator passed. The goal is that the owner rarely finds a problem the evaluator missed.

Small numbers warning: with 1 to 3 shares per post, one share swings everything. Treat a criterion change as a test, decided over at least 7 posts, never on one post.
