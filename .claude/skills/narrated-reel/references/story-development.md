# How we develop a story with the owner

The owner described this process on 16 Nov 2026, after the Messi red-card Reel (story 028, `~/Developer/football-stories-samples/story-messi-red-v2`). In their words: "This is how we come up with good content … track on the steps, evaluate if there's anything we can improve on, and always improve on the system."

The Messi debut Reel it replaced failed the owner's test: "ok, so what?" The process below turned that into a story the owner called great.

## The steps

1. **Pitch, don't build.**
   - Offer 4 to 6 story options on the subject. Each gets: a hook line, a 2 to 3 line outline, a closing question, which facts are checked (outlets named), and one honest limit.
   - Rank them for shares.
   - No voice, painting or render yet.
   - Messi: the owner turned down "five teams in one season" and "the napkin", then picked "the 47-second red card".
2. **Take the owner's arc as the brief.** The owner usually gives the shape:
   - a hook idea ("The legend who began his career with a red card");
   - a middle theme (his early temper, with teammates as sources);
   - a payoff (he became the GOAT);
   - a closing question ("Which other legend … started with a red card?").
   
   Research each beat.
3. **Say plainly when a beat isn't true or can't be sourced, and offer the nearest true version.**
   - Teammates described young Messi as shy, not fiery. The script used his own words instead: he has hated losing since he was a boy.
   - Never stretch a source to fit the arc.
4. **Settle the hook as one hard fact, and stick to it.**
   - The owner chose "Did you know Messi's Argentina debut ended with a red card after 47 seconds?" and then said: "Just stick to 47 seconds and not complicate it further."
   - Pick one sourced figure. Log the other figures (40, 43, 45) in the fact check only, never in the Reel or in questions to the owner.
5. **Send the full script for an OK before any voice or video** (owner, 15 Nov). Then build a fast first cut so the owner can see it.
6. **Depth pass.**
   - Once the owner likes the cut, offer 2 or 3 extra facts on the same thread, each with a ready line, where it goes, what's checked, and the length cost.
   - Messi: the owner asked for more of his Argentina career and merged option 2 into the ending: the 2014 final lost, the 2016 penalty missed and quitting, then 2022 world champion.
7. **Fix the owner's factual slips politely and keep their intent.**
   - The 2016 miss was the Copa América final, not the World Cup.
   - The script used both: the 2014 World Cup final lost, then the 2016 Copa América penalty.
8. **Final script OK → build → independent check → install → confirm live.**

**Evaluator gates (owner, 16 Nov 2026).** The `reel-evaluator` agent scores the pitch (before step 2), the script (before step 5) and the final cut (before the owner sees it as ready, and again before install), against [evaluators.md](evaluators.md). Only work that passes goes to the owner. Each score is logged in `data/eval-log.json`; reviews compare scores with shares and with the owner's verdicts, and propose rubric changes for the owner to confirm.

## What makes these stories work (the Messi example)

- The hook is a shock fact that also fits the person's legend ("the greatest started with a red card").
- One thread from setback to triumph: red card at 18 → finals lost → quit → world champion.
- Late payoff that ties back to the hook: "Not bad for a career that began with a red card."
- A closing question that invites people to name another case, not just yes or no.

## Improvements to make every time (evaluated 16 Nov 2026)

- **Build the setback-to-triumph arc into the first draft.** The depth pass added the strongest beat (2014 → 2016 → 2022) only at the end. Next time, look for the person's biggest failure and comeback while researching, and put it in draft 1.
- **Pitch before building.** Two Messi debut builds (v5, then the "five teams" v6) were wasted because nothing was pitched first. Apply the "ok, so what?" test to each option before any build: would a fan say "no way" and send it on?
- **Plan the length.** Aim for draft 1 at about 120 to 135 words, so a depth pass still fits under the music's `end_src`. Loop the music once at a bar line only when needed.
- **Plan the pictures around the painter's limits.** Codex refuses close-up famous faces. Plan distant shots, the moment from behind, objects (trophies, kerbs, shirts) and places from the start.
- **Ask the open questions at the start.** For example, whether press-agency photos found online are fine (the owner allowed them on 8 Nov; the older picture guide says no).

Add new steps or lessons here after each story the owner shapes. Replace any step a newer one beats.
