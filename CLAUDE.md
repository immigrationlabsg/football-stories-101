# CLAUDE.md: Football Stories 101

One true football story a day: an Astro site plus automatic Facebook, Instagram and Threads posting from GitHub.
The owner is not a developer: explain in concrete steps, and do the work directly whenever a tool path exists.
Start with `docs/runbook.md`; the house style is `docs/editorial-standards.md`; the posting format the owner signed off
on 20 Oct 2026 is `docs/posting-format.md` (do not change it without the owner). Past incidents: `docs/incidents/`.

## Definition of done (every piece of work, however small)
1. Run `npm run verify`. Zero errors. Read the warnings and act on any that touch the request.
2. For anything beyond a one-line fix, ask the **verifier** subagent (`.claude/agents/verifier.md`) to check the work
   independently: tell it what changed and what it should achieve. Fix what it finds, then verify again.
3. Check real outcomes, not intentions: read the workflow log, the Meta response or `data/sent.json` before saying
   something is posted, scheduled or fixed.
4. In the reply to the owner, say what was verified and how, and list anything still open. Never claim more than was checked.

A Stop hook (`.claude/settings.json`) runs `npm run verify` at the end of every turn and blocks while it reports errors.
GitHub runs the same check every evening (workflow **Verify**) and emails the owner if it fails.

## Never
- Put a key or token in chat, a file or a commit; secrets live only in GitHub repository secrets.
- Turn the Meta apps to Live, or link the website on social posts.
- Shorten a story by cutting facts silently, or add a fact without a fact-check entry.
