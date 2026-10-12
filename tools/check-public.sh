#!/usr/bin/env bash
# Fails if any tracked file holds a private word or a machine path. The words live in an untracked file
# (scratch/tools/flag-terms.local.txt, one per line) so this script names none of them.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
# The list is untracked, so a worktree may not have it: fall back to the main checkout's copy.
terms=scratch/tools/flag-terms.local.txt
[ -f "$terms" ] || terms="$(cd "$(git rev-parse --git-common-dir)/.." && pwd)/scratch/tools/flag-terms.local.txt"
[ -f "$terms" ] || { echo "check-public: UNCHECKED: no private word list here or in the main checkout" >&2; exit 2; }
pattern=$(grep -v '^\s*$' "$terms" | sed 's/[.[\*^$()+?{|]/\\&/g' | paste -sd'|')
if git grep -I -i -n -E "$pattern" -- . ; then
  echo "check-public: private words found in tracked files (above)" >&2
  exit 1
fi
# Machine paths: a home folder, a scratchpad or a root path says where someone worked, not what the code does.
# Write a repo-relative path, or <repo>/..., <scratchpad>/.... Two files may name the patterns: this one, and
# scratch/tools/collect_scratch.py, which rewrites them out of what it copies.
paths='/home/[^/ ]+/|/Users/[^/ ]+/|/tmp/claude|/root/'
if git grep -I -n -E "$paths" -- . ':!tools/check-public.sh' ':!scratch/tools/collect_scratch.py' ; then
  echo "check-public: machine paths found in tracked files (above): use a repo-relative path, <repo>/ or <scratchpad>/" >&2
  exit 1
fi
echo "check-public: clean"
