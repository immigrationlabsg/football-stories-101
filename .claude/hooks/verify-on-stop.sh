#!/usr/bin/env bash
# Stop hook: Claude may not finish a turn in this repo while `npm run verify` reports errors.
# Warnings are allowed. If the hook already blocked once this turn, let it stop (no endless loop).
input=$(cat)
echo "$input" | grep -q '"stop_hook_active": *true' && exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -d node_modules ] || exit 0
if ! out=$(npm run -s verify 2>&1); then
  echo "npm run verify found errors. Fix them, or tell the user exactly what is still wrong, before finishing:" >&2
  echo "$out" | grep -E "^ERROR|error\(s\)" >&2
  exit 2
fi
exit 0
