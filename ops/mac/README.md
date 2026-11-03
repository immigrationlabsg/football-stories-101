# Scheduled tasks on the owner's Mac mini (set up 3 Nov 2026)

The six tasks in `docs/scheduled-tasks.md` run here as macOS launchd jobs, at the Singapore times listed there (the
Mac's clock is set to Asia/Singapore). Each job runs `ops/mac/run-task.sh N`, which pulls `main`, reads task N's
instruction from `docs/scheduled-tasks.md` (the only copy) and gives it to Claude Code (`claude -p`, auto mode) in this
folder.

- **Where the repo lives:** `~/Developer/football-stories-101`. macOS does not let background jobs read `~/Documents`,
  so the old path `~/Documents/Claude/Projects/football-stories-101` is only a shortcut to it.
- **Reports:** each run's full output is in `~/Library/Logs/football-stories-101/` (one file per run), and its last
  line pops up as a Mac notification.
- **Switched off until the cloud copies are off.** Jobs skip (and note it in `skipped.log`) until the file
  `~/.football-stories-101/mac-tasks-on` exists, so the Mac and the cloud session never both post. To switch on:
  `mkdir -p ~/.football-stories-101 && touch ~/.football-stories-101/mac-tasks-on`; to switch off, delete that file.
- **Awake:** the job `sg.footballstories101.keep-awake` runs `caffeinate -i` while the owner is logged in, so the Mac
  never idle-sleeps (the screen still turns off). The Mac must stay logged in; after a restart, log in once.
- **Install or change times:** edit `ops/mac/install.sh` and run `zsh ops/mac/install.sh` (safe to repeat).
- **Test a task without doing it:** `zsh ops/mac/run-task.sh N test`. Claude checks it could do the task and changes
  nothing; posting, pushing, committing and starting workflows are blocked in test runs.
- **Remove everything:** `for f in ~/Library/LaunchAgents/sg.footballstories101.*.plist; do launchctl bootout gui/$(id -u) "$f"; rm "$f"; done`
