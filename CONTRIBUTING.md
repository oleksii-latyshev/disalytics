# CONTRIBUTING.md

Workflow for this repository. Applies to humans and AI agents equally.

The default branch is `main`. Every command below assumes the GitHub CLI (`gh`) is authenticated.

---

## 1. The Loop

```
issue → branch (linked) → commits → PR (Closes #N) → CI green → squash merge → branch deleted
```

Four rules:

1. **No issue, no branch.** Work that is not described somewhere cannot be reviewed against intent.
2. **Branches are created with `gh issue develop`**, so GitHub records the issue↔branch link.
3. **One PR per issue.** A PR closing two issues is two PRs.
4. **Squash merge only.** `main` has one commit per issue and a linear history.

---

## 2. Commands

### Create an issue

```bash
gh issue create \
  --title "feat(parser): stream columnar tick output from Rust" \
  --body-file .github/ISSUE_TEMPLATE/task.md \
  --label "type:feat,area:parser,phase:2" \
  --milestone "Phase 2"
```

The title is the future squash-commit subject. Write it as a conventional commit from the start
(§4) — it saves rewriting it at merge time.

### Start work

```bash
gh issue develop 42 --checkout --base main
```

This creates a linked branch (`42-feat-parser-stream-columnar-...`), checks it out, and shows the
link on the issue. Do not create branches by hand — the link is the point.

### Open the PR

```bash
gh pr create --base main --fill --assignee @me
```

The body must contain `Closes #42`. Open it as a draft while work is in progress:

```bash
gh pr create --base main --fill --draft
gh pr ready            # when it is
```

### Merge

```bash
gh pr merge --squash --delete-branch --auto
```

`--auto` merges as soon as required checks pass, so there is no waiting and no forgetting.

### Useful

```bash
gh issue list --label "phase:2" --state open
gh pr checks                      # CI status for the current branch
gh pr view --web
gh run watch                      # follow the running workflow
```

---

## 3. Labels

Created once with `gh label create`. Three orthogonal axes plus status — every issue gets one
`type:`, one `area:`, one `phase:`.

**Type** — matches the conventional-commit prefix:

| Label | Colour | Meaning |
|---|---|---|
| `type:feat` | `#1D76DB` | new capability |
| `type:fix` | `#D73A4A` | bug fix |
| `type:perf` | `#F59E0B` | performance work |
| `type:refactor` | `#7C8794` | no behaviour change |
| `type:chore` | `#586069` | tooling, deps, config |
| `type:docs` | `#0E8A16` | docs only |
| `type:test` | `#5319E7` | tests only |

**Area** — maps to the repo layout:

`area:parser` · `area:radar` · `area:timeline` · `area:analytics` · `area:ui` · `area:i18n` ·
`area:pwa` · `area:storage` · `area:ci` · `area:docs`

**Phase** — `phase:0` … `phase:6`, matching the roadmap in `AGENTS.md` §19.

**Status** — used sparingly: `blocked`, `needs-decision`, `good-first-issue`.

```bash
gh label create "type:feat"   --color 1D76DB --description "New capability"
gh label create "area:parser" --color BFD4F2 --description "Demo parsing, Rust crates, WASM"
gh label create "phase:2"     --color EDEDED --description "Roadmap phase 2"
# ...
```

Keep a `tools/scripts/labels.ts` that creates the full set idempotently, so the taxonomy is code
rather than clicks.

---

## 4. Commits and PR Titles

Conventional commits, because the squash title becomes the history:

```
feat(parser): emit columnar tick buffers without intermediate JSON
fix(radar): correct inverted Y for lower-level Nuke
perf(timeline): remove per-frame allocation from the scrub handler
chore(ci): cache the cargo target directory
```

Scopes are the `area:` labels without the prefix. Subject is imperative, lower case, no trailing
period, under 72 characters.

Commits *inside* a branch can be untidy — they get squashed. The PR title cannot.

### PR body

State what changed, why, and how it was verified. If a performance budget was touched
(`AGENTS.md` §16), include before/after numbers — not "seems faster".

```markdown
Closes #42

## What
Columnar tick buffers are written directly from Rust and transferred as ArrayBuffers.

## Why
The intermediate JSON step allocated ~1.2 GB on a 300 MB demo and blocked the worker.

## Verification
- Parse of the 340 MB fixture: peak tab memory 1.9 GB → 620 MB
- Parse time: 41 s → 24 s
- Golden snapshot unchanged
```

---

## 5. Repository Settings

Applied once, then left alone:

```bash
gh repo edit \
  --enable-squash-merge \
  --enable-merge-commit=false \
  --enable-rebase-merge=false \
  --delete-branch-on-merge \
  --enable-issues \
  --enable-discussions=false
```

Set the squash commit title to the **PR title** and the body to the **PR body** in
Settings → General → Pull Requests (also available via `gh repo edit` flags on recent versions).
Otherwise GitHub concatenates every branch commit into the message and the conventional-commit
subject is lost.

Branch protection on `main`:

- Required status checks: `typecheck`, `check`, `i18n:check`, `test`, `build`, `size`
- Require branches to be up to date before merging
- No direct pushes, no force pushes

---

## 6. Issue Templates

`.github/ISSUE_TEMPLATE/task.yml` — the default. Required fields:

- **Goal** — one sentence, in user terms, not implementation terms
- **Acceptance criteria** — a checklist someone else could verify without asking questions
- **Constraints touched** — which `AGENTS.md` hard rules or budgets are relevant
- **Out of scope** — what this issue deliberately does not do

That last field matters most for agent-assigned work: scope creep is the common failure mode, and
naming the boundary up front prevents it.

`.github/ISSUE_TEMPLATE/bug.yml` — reproduction steps, expected vs actual, demo characteristics
(map, tick rate, file size, source), browser and OS. Never attach a `.dem` file to an issue.

---

## 7. Notes for Agents

- Read `AGENTS.md` before starting, and `CODE_REQUIREMENTS.md` before writing code.
- Re-read the issue's acceptance criteria before opening the PR, and confirm each one.
- If the work turns out to need a decision listed in `AGENTS.md` §21, stop and comment on the issue
  instead of choosing. `gh issue comment 42 --body "..."`.
- If the scope grows, open a follow-up issue and link it — do not widen the current PR.
- Never merge your own PR without CI green. `--auto` exists so this is never a judgement call.
