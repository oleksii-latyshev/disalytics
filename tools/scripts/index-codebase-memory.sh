#!/bin/sh

# Git hooks are local conveniences: index failures must not block Git operations.
if ! command -v codebase-memory-mcp >/dev/null 2>&1; then
  exit 0
fi

repo_root=$(git rev-parse --show-toplevel) || exit 0
if ! codebase-memory-mcp cli --quiet index_repository --repo-path "$repo_root" >/dev/null; then
  printf '%s\n' 'codebase-memory-mcp: index refresh failed; run it manually for this repository.' >&2
fi
