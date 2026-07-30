---
name: task
description: Run the disalytics issue → branch → PR → squash-merge loop from CONTRIBUTING.md. Use when starting any piece of work, creating an issue, opening a branch or PR, or merging. Triggers on "start work on", "create an issue", "open a PR", "let's do <feature>", or any request to change code in this repo that has no issue yet.
---

# The disalytics work loop

`issue → branch (linked) → commits → PR (Closes #N) → CI green → squash merge → branch deleted`

**No issue, no branch.** Work that is not described somewhere cannot be reviewed against intent.
If the user asks for a code change and no issue exists, create one first — do not skip to editing.

## 1. Create the issue

The title becomes the squash-commit subject, so write it as a conventional commit immediately:
`type(scope): imperative subject`, lower case, no trailing period, under 72 characters. Scope is the
`area:` label without its prefix.

Every issue gets exactly one `type:`, one `area:`, one `phase:` label.

- **type:** `feat` `fix` `perf` `refactor` `chore` `docs` `test`
- **area:** `parser` `radar` `timeline` `analytics` `ui` `i18n` `pwa` `storage` `ci` `docs`
- **phase:** `phase:0` … `phase:6`, matching the roadmap in `AGENTS.md` §19

The body needs four sections, all required:

- **Goal** — one sentence in user terms, not implementation terms
- **Acceptance criteria** — a checklist someone else could verify without asking questions
- **Constraints touched** — which `AGENTS.md` hard rules (§2) or budgets (§16) are relevant
- **Out of scope** — what this issue deliberately does not do

That last field matters most. Scope creep is the common failure mode for agent-assigned work, and
naming the boundary up front is what prevents it.

```bash
gh issue create \
  --title "feat(parser): stream columnar tick output from Rust" \
  --body-file <path> \
  --label "type:feat,area:parser,phase:2" \
  --milestone "Phase 2"
```

Write the body to a file in the scratchpad rather than inlining it — multi-line `--body` through
the shell mangles markdown.

## 2. Start work

```bash
gh issue develop <N> --checkout --base main
```

Never create the branch by hand. The recorded issue↔branch link is the entire point of using this
command.

Before writing code, re-read `CODE_REQUIREMENTS.md`, and `docs/DESIGN.md` if the work is visual.

## 3. Commit

Commits inside a branch can be untidy — they get squashed. Keep them small and readable anyway.

## 4. Open the PR

Run the `dod` skill first. Do not open a PR against a red Definition of Done.

```bash
gh pr create --base main --fill --draft --assignee @me
gh pr ready    # when it is
```

The body must contain `Closes #N` and three sections:

```markdown
Closes #42

## What
<what changed>

## Why
<why, in terms of the problem — not "as requested">

## Verification
<how it was checked; before/after numbers if a budget in AGENTS.md §16 was touched>
```

"Seems faster" is not verification. If a budget was touched, measure it.

## 5. Merge

```bash
gh pr merge --squash --delete-branch --auto
```

`--auto` merges once required checks pass, so waiting for CI is never a judgement call. Never merge
your own PR without green CI.

## Rules that have no exceptions

- One PR per issue. A PR closing two issues is two PRs.
- Never push to `main`. Never force-push.
- If the work turns out to need a decision listed in `AGENTS.md` §21, stop and comment on the issue
  instead of choosing: `gh issue comment <N> --body "..."`.
- If scope grows mid-branch, open a follow-up issue and link it. Do not widen the current PR.
- Before opening the PR, re-read the issue's acceptance criteria and confirm each one explicitly.

## Useful

```bash
gh issue list --label "phase:2" --state open
gh pr checks
gh run watch
```
