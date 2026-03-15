#!/bin/bash
# Fail if any staged TypeScript/TSX file exceeds 400 lines
files=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\.(ts|tsx)$")
for f in $files; do
  if [ -f "$f" ]; then
    lines=$(wc -l < "$f")
    if [ "$lines" -gt 400 ]; then
      echo "ERROR: $f has $lines lines (max 400). Split it before committing."
      exit 1
    fi
  fi
done
exit 0
