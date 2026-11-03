# AGENTS.md: Football Stories 101

Codex and other agents: read `CLAUDE.md` first. It is the rulebook for this project and applies to you in full,
including the definition of done and the "Never" list. This file only adds what is different for agents that are not
Claude Code. If the two ever conflict, `CLAUDE.md` wins.

## Differences for Codex
- There is no Stop hook for you. Run `npm run verify` yourself before you say any work is finished, and read the output.
- The `verifier` subagent belongs to Claude Code. For anything beyond a one-line fix, say in your reply that it still
  needs an independent check, and list what changed so it can be checked.
- Do not edit files while a Claude Code session is working in this folder. Take turns, so one agent never overwrites
  the other.
- Do not commit or push unless the owner asks you to.
