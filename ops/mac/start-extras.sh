#!/bin/zsh
# Starts the "Post extras" workflow (see ops/mac/README.md). It posts only what is due and does nothing otherwise.
export PATH="$HOME/.local/bin:$HOME/.local/opt/gh/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
LOGS="$HOME/Library/Logs/football-stories-101"
mkdir -p "$LOGS"
[[ -f "$HOME/.football-stories-101/mac-tasks-on" ]] || exit 0
cd "${0:A:h:h:h}" && gh workflow run post-extras.yml --ref main -f dry_run=false >> "$LOGS/post-extras.log" 2>&1
echo "$(date): start-extras exit $?" >> "$LOGS/post-extras.log"
