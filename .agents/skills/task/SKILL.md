---
name: task
description: Run the disalytics issue-to-PR workflow for repository changes.
---

# Task workflow

`CONTRIBUTING.md` is canonical. Read only the section needed for the current operation: §§3 and 6
when creating an issue, §§2 and 4 when opening or merging a pull request.

1. Reuse the current issue and linked branch. If none exists, create an issue with the four required
   sections, five labels and matching milestone, then use `gh issue develop --base main`.
2. Preserve unrelated working-tree changes. Read only the parts of `CODE_REQUIREMENTS.md` relevant
   to the files being changed.
3. While editing, run the narrowest useful test. Run `bun run i18n:check` after locale changes
   because it regenerates the typed key union.
4. Commit, push and open a draft PR early. Required CI is the full deterministic verification gate;
   inspect detailed logs only for failed jobs.
5. Before marking the PR ready or merging, use `dod`, confirm required checks are green, and wait for
   `mergeStateStatus: CLEAN`. Squash merge and delete the branch; never push to `main` or force-push.

One issue closes one PR. The PR body contains `Closes #N`, What, Why and Verification. Measure any
touched `AGENTS.md` §16 budget; stop for the user's decision on an `AGENTS.md` §21 question.
