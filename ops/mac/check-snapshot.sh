#!/bin/zsh
# Daily 13:40 Singapore (launchd job sg.footballstories101.check-snapshot, installed by ops/mac/install.sh): checks that
# today's "Metrics snapshot" workflow run (13:00) succeeded. If its latest run failed, is still unfinished, or was not
# started today, shows a Mac notification and adds a line to the owner's report note (ops/mac/report-note.sh).
# Changes nothing on GitHub: it only reads the run list.
#
#   ops/mac/check-snapshot.sh          check, and alert if something is wrong
#   ops/mac/check-snapshot.sh dry      check and print what it would do; shows and writes nothing
set -u
MODE=${1:-run}
REPO_SLUG=immigrationlabsg/football-stories-101
export PATH="$HOME/.local/bin:$HOME/.local/opt/gh/bin:$HOME/.local/opt/node/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
LOGS="$HOME/Library/Logs/football-stories-101"
mkdir -p "$LOGS"
LOG="$LOGS/check-snapshot.log"
[[ $MODE == dry ]] && LOG=/dev/null
TODAY=$(TZ=Asia/Singapore date +%F)

PROBLEM=""
GH=${GH_BIN:-gh}   # GH_BIN lets a test point at a stand-in for gh
JSON=$($GH run list --workflow metrics-snapshot.yml --repo "$REPO_SLUG" --limit 1 --json conclusion,status,createdAt,databaseId 2>&1)
if [[ $? -ne 0 ]]; then
  PROBLEM="could not read the run list from GitHub (${JSON:0:120})"
else
  # One line: conclusion<TAB>status<TAB>createdAt<TAB>id; empty when the workflow has never run.
  FIELDS=$(print -r -- "$JSON" | /usr/bin/python3 -c 'import json,sys
d=json.load(sys.stdin)
r=d[0] if d else {}
print("\t".join(str(r.get(k) or "-") for k in ("conclusion","status","createdAt","databaseId")))' 2>&1)
  CONCLUSION=${${(s:	:)FIELDS}[1]}
  STATUS=${${(s:	:)FIELDS}[2]}
  CREATED=${${(s:	:)FIELDS}[3]}
  RUNID=${${(s:	:)FIELDS}[4]}
  if [[ -z $FIELDS || $CREATED == "-" ]]; then
    PROBLEM="the workflow has never run"
  else
    # createdAt is UTC ("2026-11-09T05:00:12Z"); compare its Singapore date with today's.
    EPOCH=$(date -j -u -f "%Y-%m-%dT%H:%M:%SZ" "$CREATED" +%s 2>/dev/null)
    RUNDAY=$([[ -n $EPOCH ]] && TZ=Asia/Singapore date -r "$EPOCH" +%F || echo "?")
    if [[ $RUNDAY != "$TODAY" ]]; then
      PROBLEM="no run today (latest run $RUNID was on $RUNDAY, $STATUS/$CONCLUSION)"
    elif [[ $STATUS != completed ]]; then
      PROBLEM="today's run $RUNID has not finished ($STATUS)"
    elif [[ $CONCLUSION != success ]]; then
      PROBLEM="today's run $RUNID ended $CONCLUSION"
    fi
  fi
fi

PROBLEM=${PROBLEM//\"/}   # no quotes or backslashes inside the osascript strings
PROBLEM=${PROBLEM//\\/}
if [[ -z $PROBLEM ]]; then
  echo "$(date): ok: latest metrics-snapshot run $RUNID succeeded today ($TODAY)" | tee -a "$LOG"
  exit 0
fi
MSG="Metrics snapshot $TODAY: $PROBLEM. Run it by hand: gh workflow run metrics-snapshot.yml --repo $REPO_SLUG (the report lists only the last 15 posts per network, so a gap must be caught up within a day or two)."
echo "$(date): PROBLEM: $PROBLEM" | tee -a "$LOG"
if [[ $MODE == dry ]]; then
  echo "dry run: would show a Mac notification and add this line to the report note: $MSG"
  exit 0
fi
SHORT=$(print -r -- "Metrics snapshot: $PROBLEM" | tr -d '"\\' | cut -c1-180)
osascript -e "display notification \"$SHORT\" with title \"Football Stories 101\" subtitle \"Daily numbers snapshot\" sound name \"Basso\"" >> "$LOG" 2>&1
print -r -- "**Metrics snapshot alert, $TODAY:** $MSG" | "${0:A:h}/report-note.sh" "check-snapshot.log" 600 "The daily metrics snapshot did not succeed today: $PROBLEM. Details are in the report note and in ~/Library/Logs/football-stories-101/check-snapshot.log." >> "$LOG" 2>&1
exit 0
