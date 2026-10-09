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

Sections: **Import**, **On the site**, **People** (owner) and **History**. Import is a guided flow with
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
- Writes must also be same-origin JSON (or carry no body at all).

**Lost every device?** Whoever holds the Cloudflare account is the root of trust:

```bash
bun run admin:invite -- --remote     # prints a fresh owner invite link for production
```

## Database migrations

Migrations are manual. `0002_photo_links.sql` remembers which copied link became which stored photo;
`0003_admin_sessions.sql` adds `admins`, `admin_sessions` and `admin_invites`. Apply before the
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
