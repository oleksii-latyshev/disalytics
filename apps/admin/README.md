# Lineups admin

A small page for the owner and a few friends to update the built-in lineups everyone sees. Drop an
exported lineups file, read what would change, settle the conflicts, press Apply. It is the only
place that writes to the lineups tables.

- **Page**: this package (`apps/admin`), React on Vite, built to `apps/admin/dist`.
- **Worker** `disalytics-admin`: `apps/api/src/admin` with the config `apps/api/wrangler.admin.jsonc`.
  It serves the page as static assets and the write API under `/api/*` on the same origin, over the
  same D1 database and KV namespace as the public API Worker. Shared wire schemas live in
  `packages/admin-contract`; the page calls the API through Effect's `HttpApiClient`.
- Nothing here touches a `.dem`; lineup files and photos only.

## What the page does

Sections: **Import**, **On the site**, **Tactics**, **People** (owner), **Contributions** (everyone: live lineups per person and map) and **History**. Import is a guided flow with
the counts and one button pinned at the bottom:

1. **File**: pick the map and drop the file exported from the lineups library. Plain-language tiles say
   how many lineups changed on the site, look like an existing one, need fixing, are new or are the same.
2. **Your decisions**: only what needs a person, one question per screen, the map beside it
   (`@disa/plate`, radar images from `VITE_DISALYTICS_WEB_URL`, default the production web app).
   - *Changed* (same id): take the best of both (every field and photo side by side), take the new
     version, keep the site's, or save as two.
   - *Looks the same* (another id, same map, kind and side, origin and landing within 48 units): merge,
     add as a different throw, or skip.
   - *Needs fixing*: a point off the radar (click the map or drag), a blank title, a non-https photo
     link. The rules live in `packages/admin-contract` (`lineupProblems`) and the Worker applies them too.
3. **Check everything**: every lineup with its outcome, edit (fields and points on the map) or leave out
   any of them; lineups only the site has can be deleted. Apply is blocked while one needs fixing.
4. **Done**: progress in parts, per-photo problems (retry, or continue without the photo), the result.
   Below it, when the file has collections for the map: **Collections**.

**Collections** (an execute or a retake) come from the same file's `collections` field and are previewed
and saved after its lineups (`POST /api/collections/preview` and `/commit`), because a member is a lineup
id that must be on the site by then. The Worker resolves each member: the lineup with that id when it is
live, else the stored lineup that id was merged into (`lineup_aliases`), else it is dropped, and a lineup
left out of the save is therefore a dropped member. Each collection reads as new, changed (same id; what is
renamed, added or removed is shown) or the same, with add / replace / skip. Two collections of a map may not
share a name, case aside (`name_taken`, `collection_name_taken`). Saving bumps the map's revision, so the
web app picks them up with the map's lineups, read-only and marked built-in. **On the site** lists them
under the lineups, each with a delete; a later deletion of a lineup drops it from the collections when served.

**Tactics** (a tab of its own, any signed-in person) are the built-in tactics of the playbook. Drop a tactic
file exported from the app's tactics library (text only, no board here yet). `POST /api/tactics/preview`
matches each tactic to the site's by id: new, changed (title, map, side, rounds, description, author,
weapons, step and plan counts, or "the board changed") or the same, with add / replace / skip; a file
without an author reads as the stored author. `POST /api/tactics/commit` saves the chosen ones in one
request (a tactic is JSON, well under the 40 MB body limit, so there is no chunking) and signs a tactic
that has no `author` with the committing person's name; an author in the file is kept. A tactic must pass
`isTactic`, name a `de_` map, have a title of 1-120 characters and fit in 1.5 MB (`tacticProblems`, applied
by the Worker too). Below the import, the site's tactics are listed (title, map, side, steps, author,
updated) with a delete (`GET /api/tactics`, `DELETE /api/tactics/:id`). Writes are logged in History under
the tactic's id and map as `tactic:save` / `tactic:delete`. The app reads them from the public
`GET /tactics`.
The board editor is `@disa/tactic-board`, the one the app uses, in place of the tab while open: **New tactic**
(map and side) or **Edit** on a row; its lineups for throws come from `GET /api/lineups/:map`, cached per map
for the page. Save sends `PUT /api/tactics/:id` with `{ tactic, basedOn }` (the same rules as a commit; a new
tactic is signed with the saver, a credited one keeps its author, a blank one on a replace keeps the stored
author) and logs `tactic:save`. `basedOn` is the `updatedAt` the editor started from: a stored tactic newer
than that (or a new one whose id exists) is refused with `tactic_changed`, and the page offers a reload.

The page sends the final lineup bodies; the Worker re-validates each, puts every photo into our storage
(embedded photos are uploaded, https links are fetched by the Worker: up to 5 MB, webp/png/jpeg checked
by their bytes, at most 3 redirects, 10 s) and saves each part in one batch. A part carries at most 24
photos (free-plan subrequest limit). **On the site** lists the stored lineups: edit one with the same
editor, or delete it (soft delete, logged).

## Who is signed in

No passwords and no outside provider. Cloudflare Access would ask for a payment method even on the
Free plan, so the Worker signs people in itself (#623):

- **Invite links.** The owner presses *Invite someone* (or *Link for a new device* on a person) and
  gets `https://…/#invite=<token>`: one use, 24 hours. The token sits in the fragment, so it never
  reaches a server log or a `Referer`. Opening it asks a new person for a name and signs that device in.
- **Device sessions.** A 256-bit token in a `__Host-disa_admin` cookie (`HttpOnly; Secure;
  SameSite=Strict`), 180 days, extended when used after a day's rest. D1 keeps only SHA-256 hashes of
  invite and session tokens.
- **Roles.** An *owner* invites people, sees every device, signs a device out and disables a person
  (never the last owner). An *editor* edits lineups. Every write records the person's name.
- **Authorship.** A person may give a Steam profile link (`https://steamcommunity.com/id/…` or `/profiles/<17 digits>`) on the invite form or later under the header (`PATCH /api/me`). A lineup committed without an `author` gets the committer's name and link; an author already in the file is kept.
- Writes must also be same-origin JSON (or carry no body at all).

**Lost every device?** Whoever holds the Cloudflare account is the root of trust:

```bash
bun run admin:invite -- --remote     # prints a fresh owner invite link for production
```

## Database migrations

Migrations are manual. `0002_photo_links.sql` remembers which copied link became which stored photo;
`0003_admin_sessions.sql` adds `admins`, `admin_sessions` and `admin_invites`; `0004_lineup_aliases.sql` adds `lineup_aliases`, which remembers the id a merged duplicate had in someone's file, so a re-exported file reads as an update of the stored lineup, not as a duplicate again (an alias whose lineup was deleted is ignored and left in place); `0005_admin_steam.sql` adds `admins.steam_url`; `0006_lineup_collections.sql` adds `lineup_collections`; `0007_tactics.sql` adds `tactics` and `tactic_revision`. Apply before the
Worker that needs them goes live:

```bash
cd apps/api && bunx wrangler d1 migrations apply disalytics-lineups --remote --config wrangler.admin.jsonc
```

## Setting it up (once)

1. Apply the migrations above, then merge: green `ci` on `main` deploys the Worker at
   `https://disalytics-admin.<account>.workers.dev`.
2. `bun run admin:invite -- --remote` and open the printed link on your device; enter your name.
3. In the page, *People and devices* → *Invite someone* for each friend; send each link privately.

## Running it locally

```bash
bun install
bun run --cwd apps/admin build                                  # the page the Worker serves
cd apps/api
bunx wrangler d1 migrations apply disalytics-lineups --local --config wrangler.admin.jsonc
bun run --cwd ../.. lineups:seed -- --local                    # the Mirage built-ins, optional
bun run dev:admin                                               # http://localhost:8788
bun run --cwd ../.. admin:invite -- --local                    # a link to sign in locally
```

To skip invites while developing, `printf 'ALLOW_DEV_IDENTITY=dev@localhost\n' > .dev.vars`
(gitignored) makes every localhost request an owner.

`ALLOW_DEV_IDENTITY` is honoured only when the request host is `localhost`, `127.0.0.1` or `[::1]`.
A deployed Worker is reached on its `workers.dev` host and the variable is not in the deployed config
(`.dev.vars` is not deployed), so the bypass cannot be used in production. The local database lives
in `apps/api/.wrangler/` and never touches the remote D1 or KV. For hot reload of the page run
`bun run --cwd apps/admin dev` too and open `http://localhost:5174`; it proxies `/api` to 8788.

```bash
bun run --cwd apps/api test       # Worker: invites, sessions, planning, commit, routes (real SQLite)
bun run --cwd apps/admin test     # page helpers
bun run --cwd apps/admin build    # typecheck, build, wrangler deploy --dry-run
```

## Photos

Embedded and copied photos are stored in KV under the SHA-256 of their bytes and linked as
`https://disalytics-api.disa-67b.workers.dev/photos/<sha256>` (`PHOTO_BASE_URL`). Content addressing
makes a repeated upload harmless. Every imported photo is stored here, so a big first import (the 42 photos of a map) is a large part
of the free plan's 1,000 KV writes a day; a re-import costs none, because `photo_links` remembers each
copied link and a `local:<sha>` photo is the stored photo with that SHA-256.
