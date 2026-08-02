---
name: handoff
description: Write a briefing that lets a fresh chat continue this work without re-deriving it — where things stand, what is next, and which traps have already been paid for. Use when the user asks to hand work off, transfer context, or start a new chat on it: "перенос контекста в другой чат", "напиши инструкцию для нового чата", "что делать дальше", "hand this off", "brief the next session".
---

# Handing work to a new session

`task` and `dod` govern work inside one session. This governs what survives between them.

The reader is **you, cold** — same tools, same repository, no memory of this conversation. It loads
`CLAUDE.md` automatically and reads `AGENTS.md` on demand. Write for that reader, not for the user,
and write it in the language the user has been using.

## 1. What to carry

Carry only what the repository cannot tell the next session itself.

| Belongs in the handoff | Leave it out |
|---|---|
| What was measured, and the actual number | What the code does — it will read the code |
| Why an obvious-looking simplification is wrong | Hard rules, architecture, conventions (`AGENTS.md`) |
| What is unverified, and why it could not be verified | Commands (`CLAUDE.md`) |
| Which decisions are the human's and still open | Anything in a document it loads anyway |
| Issue numbers, SHAs, URLs, exact file paths | History that `git log` answers |

If you catch yourself summarising a document, cite it instead. A briefing that paraphrases
`AGENTS.md` spends the reader's attention on something it was going to read anyway, and goes stale
the day that document changes.

## 2. Durable findings go in issues, not only here

A handoff file is disposable. Anything discovered this session that will still matter in a month —
a platform trap, a broken assumption, a gap in the tooling — gets an issue **before** you write the
handoff, and the handoff points at its number.

Knowledge that exists only in a pasted message dies the first time someone loses the paste.

## 3. Evidence, not conclusions

A conclusion the next session cannot check is a conclusion it has to re-derive. Give it the
measurement.

> Weak: `workflow_run` runs against the wrong commit.
>
> Usable: a `workflow_run` job does not run at the triggering commit — measured on run
> `30689471224`, the preview job ran at `8676727` (main's head) while the pull request's head was
> `3b9e59c`.

Same for anything you are carrying forward: name the run, the file, the command, the number.

## 4. The shape

```markdown
# <project> — handoff

<one line telling the user to paste this whole thing as the first message of the new chat>

## Where things stand — <absolute date>
<what is merged, what is live, what the current baseline numbers are>

## Open work, in priority order
<per task: the issue number, then only the context that is NOT in the issue or the repo>

## Traps already paid for
<per trap: what happens, and what not to "simplify" away, with the reason>

## The human's call, not yours
<decisions deliberately left open; anything the agent must ask about rather than choose>

## Mechanics
<conventions that get forgotten: commit trailers, hook skips, pinned versions, house rules>
```

Open the task list with the one the user actually asked for, and say so — priority is information
the next session cannot infer.

## 5. Delivering it

Write the file to the scratchpad directory, never into the repository, then send it with
`SendUserFile` so the user can hand it over as one paste. Then summarise in chat what you put in it
and what you deliberately left out.

## Never

- **Never write "as we discussed" or "the PR we merged".** The next session was not there. Name it.
- **Never use a relative date.** "Yesterday" and "last week" resolve to nothing. Absolute only.
- **Never present an unverified thing as done.** If a deploy never ran, a URL was never fetched, or
  a check was skipped, the handoff says so in the same sentence that mentions it.
- **Never carry a stale task list.** Re-read the issue states before writing; a session that has
  been running for hours may be describing work someone else has since closed.
- **Never hand over a conclusion you cannot point at evidence for.**
