---
name: codebase-memory
description: Use the codebase-memory-mcp graph to investigate disalytics architecture, symbols, call paths, or change impact when the graph can narrow source discovery.
---

# Codebase memory in disalytics

Use the project-scoped `codebase-memory-mcp` server for structural questions about this repository. Check whether this repository is indexed and whether relevant paths have current coverage before relying on graph results. If the index is missing or stale, index **this repository's absolute root only**. Never enable global `auto_index`, `auto_watch`, or `watcher_enabled` for this workflow, and never index another repository as a side effect.

Start with the smallest useful graph query, such as architecture, symbol search, path tracing, or change impact. Confirm conclusions in source, especially when coverage is incomplete or files have changed since indexing. Use ordinary source search for text, configuration, generated files, or anything the graph does not cover.

The Git hooks in `lefthook.yml` update the index after checkout, merge, rewrite, and commit. For uncommitted edits, inspect the source directly or explicitly refresh this repository's index when current graph state matters. If the MCP server is unavailable, continue with source inspection and report that graph evidence was unavailable.

For headless Antigravity CLI, select `agy --project disalytics` so it uses this project's scoped MCP permissions. A plain `agy --print` session uses the generic `CLI Project` and cannot call this MCP without an interactive approval.
