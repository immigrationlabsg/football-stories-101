#!/bin/zsh
# Starts one scheduled task from docs/scheduled-tasks.md in a Claude Code session on the owner's Mac (launchd; see
# ops/mac/README.md). The instruction is read from that file at run time, so it stays the only copy.
#
#   ops/mac/run-task.sh 2          run task 2 (skipped until the Mac's tasks are switched on)
#   ops/mac/run-task.sh 2 test     a test: Claude checks it could do the task, changes nothing, starts no run
set -u
N=$1
MODE=${2:-run}
REPO=${0:A:h:h:h}
export PATH="$HOME/.local/bin:$HOME/.local/opt/gh/bin:$HOME/.local/opt/node/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
LOGS="$HOME/Library/Logs/football-stories-101"
mkdir -p "$LOGS"
LOG="$LOGS/$(date +%Y-%m-%d-%H%M)-task$N-$MODE.log"

# Until the owner switches off the cloud copies, the cloud session runs these tasks; running both would post twice.
if [[ $MODE == run && ! -f "$HOME/.football-stories-101/mac-tasks-on" ]]; then
  echo "$(date): task $N skipped: the Mac's tasks are not switched on yet (cloud session runs them)" >> "$LOGS/skipped.log"
  exit 0
fi

cd "$REPO" || exit 1
git pull --ff-only -q origin main >> "$LOG" 2>&1
PROMPT=$(awk -v n="$N" '
  /^## / { f = ($2 == n ".") ; next }
  f && /^```/ { if (inblock) exit; inblock = 1; next }
  f && inblock { print }
' docs/scheduled-tasks.md)
if [[ -z $PROMPT ]]; then
  echo "$(date): no task $N in docs/scheduled-tasks.md" >> "$LOG"
  exit 1
fi
if [[ $MODE == test ]]; then
  PROMPT="TEST RUN of a scheduled task on the owner's Mac. Do NOT carry out the task: change no file, commit or push nothing, start, rerun or cancel no GitHub workflow, post nothing and message no one. Only check you could do it from here: read the files it names, run read-only commands it needs (for example gh run list, gh auth status, git status, npm run verify), and report in a few lines whether every tool and permission it needs works, and what you would do now.

The task:
$PROMPT"
fi
echo "$(date): task $N ($MODE) starting" >> "$LOG"
GUARD=()
# A test can never post, push or start a run, whatever the model decides.
[[ $MODE == test ]] && GUARD=(--disallowedTools "Bash(gh workflow:*)" "Bash(gh run rerun:*)" "Bash(gh run cancel:*)" "Bash(gh api:*)" "Bash(git push:*)" "Bash(git commit:*)" "Bash(curl:*)" "Edit" "Write")
# The instruction goes in on stdin: --disallowedTools takes every argument after it.
OUT=$(print -r -- "$PROMPT" | claude -p --permission-mode auto "${GUARD[@]}" 2>&1)
STATUS=$?
print -r -- "$OUT" >> "$LOG"
echo "$(date): task $N ($MODE) finished, exit $STATUS" >> "$LOG"
# The Monday growth review's report goes in the owner's vault, with an alert that stays up (owner, 5 Nov 2026).
if [[ $N == 6 && $MODE == run ]]; then
  if [[ $STATUS == 0 ]]; then
    print -r -- "$OUT" | "${0:A:h}/report-note.sh" "${LOG:t}" >> "$LOG" 2>&1
  else
    osascript -e "display dialog \"This week's growth review did not finish. See ${LOG:t} in ~/Library/Logs/football-stories-101.\" with title \"Football Stories 101\" buttons {\"OK\"} giving up after 86400" >> "$LOG" 2>&1
  fi
  exit 0
fi
# Every other task's report to the owner: a Mac notification with its last line; the whole report is in the log.
LAST=$(print -r -- "$OUT" | grep -v '^[[:space:]]*$' | tail -1 | tr -d '"\\' | cut -c1-200)
osascript -e "display notification \"$LAST\" with title \"Football Stories: task $N\" subtitle \"Log: ${LOG:t}\"" 2>/dev/null
