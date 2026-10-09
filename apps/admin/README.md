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

1. Pick a map, drop the file exported from the lineups library (version 2: photos embedded as
   `local:` refs plus an `images` map, or as links).
2. The server compares each lineup of that map with what is stored and the page groups them:
   **updates** (same id, with a field diff), **possible duplicates** (another id, same map, kind and
   side, origin and landing each within 48 world units), **new**, **unchanged**.
3. Per row: add, replace, keep both or skip. Title and tags are editable in place. Embedded photos
   are uploaded to our storage; "copy link photos into our storage" also fetches linked photos on
   the server (https only, up to 5 MB, webp/png/jpeg checked by their bytes, at most 3 redirects, 10 s).
4. Apply writes in parts of at most 24 photos each (a Worker request has a subrequest limit on the
   free plan), shows progress and a per-part result, and bumps the map's revision. The public API
   serves the new set within about a minute.
5. Below: the map's current built-ins, each deletable (soft delete, logged), and the recent changes
   with the person who made them.

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
makes a repeated upload harmless. Free-plan ceilings (1,000 KV writes a day) are the reason to keep
"copy link photos" for the first import and not for every run.
