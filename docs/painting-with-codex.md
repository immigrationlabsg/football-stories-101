# Painting with the owner's ChatGPT plan through Codex

**Status (3 Nov 2026): in use and the default painter.** `npm run paint:codex -- N` (scripts/paint-codex.ts) on the
Mac; the API workflow is the fallback. How to use it: docs/runbook.md section 13. First painting: 043, Raúl v Messi.
The plan below is kept as the record of how it was set up (step 3's shell script became scripts/paint-codex.ts).

Owner, 3 Nov 2026: use the ChatGPT subscription for paintings instead of OpenAI API credit, automatically.

## What OpenAI offers (checked 3 Nov 2026, from search results; developers.openai.com could not be opened from the cloud)

- OpenAI's Codex CLI, signed in with a ChatGPT plan (`codex login`), can generate and edit images: ask in plain words
  or include `$imagegen` in the prompt. It uses `gpt-image-2` and counts toward the plan's Codex usage limits, about
  3-5 times faster than a text turn. Not on the Free plan. OpenAI's own docs say larger batches are better run with an
  API key (billed at API rates). Sources: https://developers.openai.com/codex/cli/features.md (as quoted in search
  results), https://chatgpt.com/codex/pricing/
- This is OpenAI's own sanctioned route. Community "bridge" tools that reuse the Codex login from other programs exist
  on GitHub; they are unofficial and may break or breach the terms: do not use them.

## Plan

1. On the Mac: install Codex CLI and run `codex login` with the owner's ChatGPT account (the owner logs in in the
   browser; no key is pasted anywhere).
2. Test with one story already painted the usual way (for example 015 or 018): give Codex the reference photo from
   design/references/ and the style reference public/images/stories/001-ronaldo-r9.jpg, with the same instructions as
   scripts/paint-gpt.ts (the `wording` text and the per-story prompt), ask for a 1024x1024 image saved to
   design/paintings/NNN.png. Compare it at full size with the API painting against docs/picture-guide.md, and show the
   owner both.
3. If the owner approves the look: add scripts/paint-codex.sh that runs `codex exec` once per story with that prompt and
   the two images, saving to design/paintings/NNN.png, and have the Saturday drafting job on the Mac use it instead of
   the "Paint with GPT Image" workflow. Keep the API workflow as the fallback when the plan's limits are reached
   (`/status` in Codex shows them).
4. Record in docs/runbook.md which route paints, and in docs/growth-log.md the cost before and after.

## Limits to keep in mind

- Painting then needs the Mac on and logged in; the cloud session cannot use the ChatGPT plan.
- About 10-15 paintings a week; if Plus limits run out mid-week, the fallback is the API (a few dollars).
- The picture standard does not change: every named player from a real photo of him, checked at full size.
