#!/bin/zsh
# Installs the six scheduled tasks of docs/scheduled-tasks.md as launchd jobs (Singapore times; the Mac's clock is
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
job 5 instagram-link "1 11 23"
job 6 growth-review "1 12 41"

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
