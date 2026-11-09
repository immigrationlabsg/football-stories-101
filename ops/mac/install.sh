#!/bin/zsh
# Installs the scheduled tasks of docs/scheduled-tasks.md as launchd jobs (Singapore times; the Mac's clock is
# Asia/Singapore) plus a job that keeps the Mac from idle sleep. Safe to run again. See ops/mac/README.md.
set -eu
REPO=${0:A:h:h:h}
AGENTS="$HOME/Library/LaunchAgents"
mkdir -p "$AGENTS" "$HOME/Library/Logs/football-stories-101"

# slot "weekday hour minute": weekday 0 = Sunday ... 6 = Saturday
job() {
  local n=$1 name=$2; shift 2
  local label="sg.footballstories101.task$n-$name" slots="" w h m
  for s in "$@"; do
    read w h m <<< "$s"
    slots+="<dict><key>Weekday</key><integer>$w</integer><key>Hour</key><integer>$h</integer><key>Minute</key><integer>$m</integer></dict>"
  done
  cat > "$AGENTS/$label.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>$label</string>
<key>ProgramArguments</key><array><string>/bin/zsh</string><string>$REPO/ops/mac/run-task.sh</string><string>$n</string></array>
<key>StartCalendarInterval</key><array>$slots</array>
<key>StandardOutPath</key><string>$HOME/Library/Logs/football-stories-101/launchd.log</string>
<key>StandardErrorPath</key><string>$HOME/Library/Logs/football-stories-101/launchd.log</string>
</dict></plist>
PLIST
  launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$AGENTS/$label.plist"
  echo "installed $label"
}

job 1 morning-post "1 7 50" "2 7 50" "3 7 50" "4 7 50" "5 7 50" "6 9 50" "0 9 50"
job 2 delivery-check "1 8 16" "2 8 16" "3 8 16" "4 8 16" "5 8 16" "6 10 16" "0 10 16"
job 3 research "4 8 52"
job 4 drafting "6 8 47"
job 6a growth-review "1 12 41"
job 6b wednesday-decision "3 12 47"
# Task 6 was split into 6a and 6b on 9 Nov 2026: remove the old job so the Monday review does not run twice.
old=sg.footballstories101.task6-growth-review
launchctl bootout "gui/$(id -u)/$old" 2>/dev/null || true
rm -f "$AGENTS/$old.plist"
job 7 adhoc-reels "0 14 7"
# Tasks 8 (picture Reels) and 9 (Facebook swap) are OFF on purpose since 8-9 Nov 2026: the Reels are built by hand
# with the owner's approval, and the desktop scheduled task fs101-swap-reel-031 does the swap daily at 11:10.
# Don't re-add them here without the owner's say.

# Every evening at 19:45, start "Post extras": it posts any narrated extra due at 20:00 and does nothing otherwise.
# No Claude session is involved; GitHub's own schedule for the workflow is the backup.
label=sg.footballstories101.post-extras
cat > "$AGENTS/$label.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>$label</string>
<key>ProgramArguments</key><array><string>/bin/zsh</string><string>$REPO/ops/mac/start-extras.sh</string></array>
<key>StartCalendarInterval</key><dict><key>Hour</key><integer>19</integer><key>Minute</key><integer>45</integer></dict>
<key>StandardOutPath</key><string>$HOME/Library/Logs/football-stories-101/launchd.log</string>
<key>StandardErrorPath</key><string>$HOME/Library/Logs/football-stories-101/launchd.log</string>
</dict></plist>
PLIST
launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$AGENTS/$label.plist"
echo "installed $label"

# Every day at 13:40 (Singapore), 40 minutes after the 13:00 "Metrics snapshot" workflow: if its latest run failed or did
# not run today, put up a Mac notification and add a line to the owner's report note (ops/mac/check-snapshot.sh).
label=sg.footballstories101.check-snapshot
cat > "$AGENTS/$label.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>$label</string>
<key>ProgramArguments</key><array><string>/bin/zsh</string><string>$REPO/ops/mac/check-snapshot.sh</string></array>
<key>StartCalendarInterval</key><dict><key>Hour</key><integer>13</integer><key>Minute</key><integer>40</integer></dict>
<key>StandardOutPath</key><string>$HOME/Library/Logs/football-stories-101/launchd.log</string>
<key>StandardErrorPath</key><string>$HOME/Library/Logs/football-stories-101/launchd.log</string>
</dict></plist>
PLIST
launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$AGENTS/$label.plist"
echo "installed $label"

# Keep the Mac awake (no idle sleep; the screen may still turn off) whenever the owner is logged in.
label=sg.footballstories101.keep-awake
cat > "$AGENTS/$label.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>$label</string>
<key>ProgramArguments</key><array><string>/usr/bin/caffeinate</string><string>-i</string></array>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
</dict></plist>
PLIST
launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$AGENTS/$label.plist"
echo "installed $label"
