# CLAUDE.md

> **This file holds only what is specific to Claude Code.** Everything about the project — rules,
> architecture, commands, workflow — lives in `AGENTS.md`, shared with humans and other agents, and is
> imported below. Do not copy anything from `AGENTS.md` into this file; change it there.

@AGENTS.md

## Claude Code specifics

- **Skills** in `.claude/skills`: `task` (issue → PR loop), `i18n-key` (any user-facing string),
  `dod` (before opening or updating a PR), `handoff` (continuing in a new chat).
- **Dev server** is the `web` entry in `.claude/launch.json` (`:5173`) — start it with `preview_start`,
  never through Bash.
- **The in-app Browser pane reports the tab as hidden**: rAF, transitions and `motion` animations stall
  there, so it cannot measure frames, hovers or timing, and its screenshots are downscaled. Use it for
  DOM, computed styles and flows; measure in headed Chrome over CDP.
- **Kill a test Chrome by its profile path** (`pkill -f "user-data-dir=<scratchpad>/…"`), never by the
  binary name — that closes the owner's own browser.
- **Screenshots of the review screen** may leave the machine only with a shipped sample match open;
  a private demo carries real names and SteamIDs.
- `cargo` may not be on `PATH` in this shell.
