#!/bin/zsh
# Hands a weekly growth report to the owner: adds it to the rolling note in the Obsidian vault and puts up a Mac alert
# that stays on screen, with a button that opens the note. The report text comes in on stdin.
#
#   print -r -- "$REPORT" | ops/mac/report-note.sh ["log file name"] [seconds the alert stays up, default a day] ["alert message"]
#
# macOS refuses a background job access to ~/Documents, so Obsidian itself adds the text, through its obsidian:// link
# (tried 5 Nov 2026: a direct append fails with "operation not permitted"). The job can't read the note back, so the alert
# also names the log, which always holds the full report.
set -u
LOG_NAME=${1:-the newest task6 file}
ALERT_SECONDS=${2:-86400}
ALERT_MESSAGE=${3:-}
VAULT='Obsidian Vault'
NOTE='Projects/Football Stories 101/Football Growth Reports'
TEXT=$(cat)
ENCODE='import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=""))'
V=$(print -rn -- "$VAULT" | /usr/bin/python3 -c "$ENCODE")
F=$(print -rn -- "$NOTE" | /usr/bin/python3 -c "$ENCODE")
C=$(print -r -- "

## $(date +'%-d %b %Y')

$TEXT" | /usr/bin/python3 -c "$ENCODE")

open -g "obsidian://new?vault=$V&file=$F&content=$C&append=true&silent=true"
print -r -- "note: asked Obsidian to add the report, exit $?"

MESSAGE="This week's growth report is ready in your vault. If it isn't there, it's in ~/Library/Logs/football-stories-101 ($LOG_NAME)."
[[ -n $ALERT_MESSAGE ]] && MESSAGE=$ALERT_MESSAGE
CHOICE=$(osascript -e "display dialog \"$MESSAGE\" with title \"Football Stories 101\" buttons {\"Later\", \"Open report\"} default button 2 giving up after $ALERT_SECONDS" 2>&1)
print -r -- "alert: $CHOICE"
[[ $CHOICE == *"Open report"* ]] && open "obsidian://open?vault=$V&file=$F"
exit 0
