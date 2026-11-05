#!/bin/zsh
# Hands a weekly growth report to the owner: adds it to the rolling note in the Obsidian vault and puts up a Mac alert
# that stays on screen, with a button that opens the note. The report text comes in on stdin.
#
#   print -r -- "$REPORT" | ops/mac/report-note.sh ["log file name"] [seconds the alert stays up, default a day]
#
# macOS lets a background job add to a known file in ~/Documents but not list the folder, so the note must already exist
# and is only ever appended to. If it can't be written, the alert says so and points to the log.
set -u
LOGNAME_=${1:-}
ALERT_SECONDS=${2:-86400}
NOTE="$HOME/Documents/Obsidian Vault/Projects/Football Stories 101/Football Growth Reports.md"
URI='obsidian://open?vault=Obsidian%20Vault&file=Projects%2FFootball%20Stories%20101%2FFootball%20Growth%20Reports'
REPORT=$(cat)

if print -r -- "

## $(date +'%-d %b %Y')

$REPORT" >> "$NOTE" 2>/dev/null; then
  MESSAGE="This week's growth report is ready in your vault."
  BUTTONS='{"Later", "Open report"}'
else
  MESSAGE="This week's growth report could not be saved to your vault. The full report is in the log: ${LOGNAME_:-~/Library/Logs/football-stories-101}"
  BUTTONS='{"OK"}'
  URI=''
fi

CHOICE=$(osascript -e "display dialog \"$MESSAGE\" with title \"Football Stories 101\" buttons $BUTTONS default button 1 giving up after $ALERT_SECONDS" 2>&1)
print -r -- "alert: $CHOICE"
[[ -n $URI && $CHOICE == *"Open report"* ]] && open "$URI"
exit 0
