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
# humans — renders the issue form in $EDITOR
gh issue create --template task.yml

# agents — write the four required sections to a file first
gh issue create \
  --title "feat(parser): stream columnar tick output from Rust" \
  --body-file <path> \
  --label "type:feat,area:parser,phase:2" \
  --milestone "Phase 2"
```

Blank issues are disabled. The four sections in `task.yml` (§6) are required either way.

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

The taxonomy is code rather than clicks — `tools/scripts/labels.ts` and
`tools/scripts/milestones.ts` create the full set idempotently and are safe to re-run:

```bash
bun run repo:labels
bun run repo:milestones
```

Add or rename a label by editing the script and re-running it, never through the web UI.

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

### Evidence for screen work

An acceptance criterion asking for a screenshot has to be satisfiable from a branch, and one of them
is not: **attaching an image to a pull request needs the GitHub web UI.** There is no `gh` or REST
path for it. So the division is fixed rather than negotiable.

**Who does what.** Whoever does the work captures the images and hands them to the owner as files in
the chat. The owner attaches them, if they are attachable at all. A pull request body never links to
an image it cannot carry, and a criterion phrased as "screenshots in the pull request" is read as
"screenshots to the owner" — that is what satisfies it.

**The review screen is never attachable.** It carries ten real players' names and SteamIDs
(`AGENTS.md` §18), so its screenshots may not go into an issue, a pull request, or anything else that
leaves this machine. Screen work on it is evidenced by measurement instead, and these are the forms
that have stood in for a picture:

- **Measured geometry** at a named viewport — `docs/DESIGN.md` §5.1's plate table is the model, and
  it is a claim with a setup: state the viewport *height*, and which of §5.1's preconditions were on.
- **An overflow sweep** over `document.querySelectorAll('*')`, not over a list of known classes. Walk
  `overflow` on each hit's ancestors, or every `sr-only` label reports as overflow.
- **Computed styles** read off the elements themselves, which is what settles a token question.
- **An `sr-only` or `aria-label` text dump**, which says what a screen reader hears without saying
  who is playing.
- **Frame counts** over a few hundred frames, per `AGENTS.md` §16.

**The in-app browser pane is not a capture tool.** Its screenshots are downscaled to an 800px cap and
it can return a stale frame after a navigation, so the same page shot twice gives two layouts. It is
fine for reading the DOM and for driving a click; it is not evidence.

**The recipe, so the next screen issue does not rewrite it.** Headless or headed Chrome over CDP,
driven by Bun's built-in `WebSocket` — no new dependency, which is what `AGENTS.md` §2 rule 10 asks
of it.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 --user-data-dir="$SCRATCH/chrome-profile" \
  --no-first-run --no-default-browser-check --window-size=1440,1000 \
  --disable-backgrounding-occluded-windows --disable-renderer-backgrounding \
  --disable-features=CalculateNativeWinOcclusion about:blank
```

Then over the socket from `http://localhost:9222/json`:
`Emulation.setDeviceMetricsOverride` for the CSS viewport, `Page.captureScreenshot` with
`deviceScaleFactor: 2` for an honest 2× PNG, and `Runtime.evaluate` for everything measured.

Four things about that run are load-bearing and each has cost a session:

- **Assert `innerWidth`, `innerHeight` and `document.visibilityState` inside the run.** A figure
  taken without them is a figure for an unknown viewport, or for a tab whose rAF was suspended.
- **Kill the browser by its profile path**, `pkill -f "user-data-dir=$SCRATCH/chrome-profile"` —
  never by the binary name, which matches the everyday browser and closes its tabs.
- **Delete the profile directory afterwards.** It is ~150 MB and its OPFS holds a parsed copy of the
  demo, which carries the ten players out of the app and into a temp directory.
- **Ask before using a real demo, every session.** That permission does not carry over.

---

## 5. Repository Setup

Created once:

```bash
gh repo create disalytics --public \
  --description "Client-side Counter-Strike demo analyzer. Parses .dem files in your browser with Rust/WASM — nothing is uploaded." \
  --homepage "https://disalytics.gg"

gh repo edit --add-topic counter-strike,cs2,demo-parser,webassembly,rust,react,typescript,esports,replay-analysis,pwa
```

Topics carry the discoverability, not the name — someone searching "cs2 demo parser" finds the
repository through the topics and description, which is why the name is free to be game-agnostic.

Then the merge policy:

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

Branch protection on `main` — **ready to switch on.** `.github/workflows/ci.yml` exists since #20
and runs `typecheck` → `check` → `i18n:check` → `test` → `build` → `size` on every pull request and
every push to `main`. Once it has run green once, apply:

- Required status check: **`ci`** — one job, so one check. The six commands are steps inside it, not
  separate checks; a red step fails `ci` and names itself in the log.
- Require branches to be up to date before merging
- No direct pushes, no force pushes

One caveat to know before turning the check on: `ci.yml` carries `paths-ignore: ['crates/**']`, so a
pull request that touches **only** `crates/**` never starts it, and a required check that never
starts stays pending forever. That is deliberate — a frontend workflow has no business rebuilding
the parser (`AGENTS.md` §15) — but it means parser-only pull requests wait on `wasm.yml` and need
`ci` marked required-but-not-blocking, or an admin merge, until that workflow exists.

Until protection is applied the rules above are held by discipline, not by the platform.

### Git hooks

Lefthook installs `pre-commit` and `pre-push` on `bun install` — `lefthook` is listed in
`trustedDependencies`, so its install step runs and writes `.git/hooks`. There is no manual setup
step, and no `postinstall` script of our own. If the hooks ever go missing, `bun lefthook install`
restores them.

What runs, and against what (`lefthook.yml`, and `CODE_REQUIREMENTS.md` §13):

| Hook | Job | Scope |
|---|---|---|
| pre-commit | `biome check` | the staged files, passed as arguments |
| pre-commit | `bun run typecheck` | the whole project, and only when the commit stages a `*.ts`/`*.tsx` file |
| pre-commit | `cargo fmt --check` | `demo-parser` and `demo-parser-wasm`, and only when the commit stages `crates/**`, `Cargo.toml`, `Cargo.lock` or `rust-toolchain.toml` |
| pre-commit | `cargo clippy` | the workspace, same trigger |
| pre-push | `bun run test` | the whole test suite |

`tsc` has no staged-file mode — it type-checks a project, not a file list, and a file list would
report errors that are artefacts of the missing context. So the staged files decide *whether* the
typecheck runs, not *what* it covers. It is a full `turbo run typecheck`, cached, ~1.4 s cold,
followed by `tsc -p tsconfig.tools.json` over `tools/scripts` — those files are not in a workspace,
so turbo cannot see them, and they are not cached.

Biome does not rewrite files here. A failure prints what to run (`bun run check:fix`); it never
stages fixes on your behalf, because writing a file that is only partially staged would commit
hunks you did not stage.

The two Rust jobs are the same two lines `.github/workflows/wasm.yml` runs, so a commit that passes
them is one `wasm` will not bounce for formatting or a lint — the rest of that workflow, from
`cargo test` to the size gate, still runs only there. Clippy is `--workspace --all-targets -- -D warnings`, and
the level that matters lives in `Cargo.toml` under `[workspace.lints.clippy]`: `all` is denied and
`pedantic` is warned, so `-D warnings` is what turns a pedantic lint into a failed commit. Keep the
hook and the workflow in step — a hook that lints more loosely than CI is a hook that stops
predicting it. Like `tsc`, both read the working tree rather than the staged content, and neither
rewrites a file: `cargo fmt --package demo-parser --package demo-parser-wasm` is yours to run.

They cost about half a second on a warm `target/`, and ~17 s on a cold one — the first Rust commit
after a `cargo clean` or a toolchain bump pays for a full check of the workspace. A commit that
stages no Rust pays nothing: lefthook filters on the glob and never starts the process. `cargo`
itself is looked up with `~/.cargo/bin` prepended to `PATH`, because a git hook is not always
launched from a login shell that has it.

Pre-commit is skipped during a `rebase`: those commits were checked when they were written, and
re-checking every replayed commit is what makes people turn hooks off for good. It is **not**
skipped during a `merge` — a conflict resolution is new code that nothing has looked at yet, and
that is exactly when a check earns its keep.

### Skipping a hook on purpose

Sometimes you need the commit anyway — a WIP commit before a bisect, a rebase that has to land
before it can pass, a push whose failure is the point. Skip deliberately and narrowly:

```bash
LEFTHOOK_EXCLUDE=typecheck git commit -m "..."   # one job
LEFTHOOK=0 git commit -m "..."                   # all hooks, this command
LEFTHOOK=0 git push                              # skip the pre-push tests
```

`git commit --no-verify` works too, and skips everything for that command.

Two rules around this: a skipped hook is temporary, and a PR that reached `main` with a skipped
check says so in its body. Turning hooks off permanently (`bun lefthook uninstall`) is not a
supported state — if a hook is wrong often enough to want that, fix the hook.

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
