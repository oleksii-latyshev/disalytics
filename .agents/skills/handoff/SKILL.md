---
name: handoff
description: Write a briefing that lets a fresh chat continue disalytics work without re-deriving it.
---

# Handoff

Write for a fresh agent that already receives `AGENTS.md`. Carry only facts the repository cannot
recover cheaply:

- current issue, PR, branch, SHA and exact status;
- measurements with their command or run URL;
- unverified work and why it remains unverified;
- traps whose tempting alternative was disproved;
- open decisions that belong to the user.

Do not summarise project rules, commands, code, or history available through `git`. Use absolute
dates, never "today" or "yesterday", and never present an unverified result as complete. Re-read
remote issue and PR state immediately before writing.

Order open work by the user's priority. Put durable discoveries in an issue and reference it. Write
the handoff to a scratch file outside the repository and return it as a local file link.
