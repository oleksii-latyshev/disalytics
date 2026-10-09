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

The Worker accepts a request only with a valid `Cf-Access-Jwt-Assertion`: RS256, checked with
WebCrypto against `${TEAM_DOMAIN}/cdn-cgi/access/certs`, with `iss`, `aud`, `exp` and `nbf` verified.
The verified email is recorded as the author of every write. While `TEAM_DOMAIN` or `POLICY_AUD` is
empty every `/api/*` request is refused with 403. Writes must also be same-origin JSON.

## Database migration

`migrations/0002_photo_links.sql` adds the `photo_links` table (which copied link became which stored
photo, so a re-imported file reads as unchanged). It is one `CREATE TABLE` and applies on top of the
remote 0001. Migrations are manual; apply it before the new admin goes live:

```bash
cd apps/api && bunx wrangler d1 migrations apply disalytics-lineups --remote --config wrangler.admin.jsonc
```

## Setting it up (once, in the Cloudflare dashboard)

1. Deploy the Worker (green `ci` on `main` does it, or `cd apps/api && bunx wrangler deploy --config
   wrangler.admin.jsonc` after `bun run --cwd apps/admin build`). Its URL is
   `https://disalytics-admin.<account>.workers.dev`.
2. **Workers & Pages > disalytics-admin > Settings > Domains & Routes**: on the `workers.dev` row choose
   **Enable Cloudflare Access**. Leave `preview_urls` off (it is off in the config).
3. Click **Manage Cloudflare Access** to open the Access application. In its policy choose **Allow**
   and add the emails that may sign in (yours and your friends'), with login method *One-time PIN*.
   Anyone not listed never reaches the Worker.
4. Copy the application's **Application Audience (AUD) Tag** and your **team domain**
   (`https://<team>.cloudflareaccess.com`, Zero Trust > Settings > Custom Pages / General).
5. Put them in `apps/api/wrangler.admin.jsonc` under `vars` as `POLICY_AUD` and `TEAM_DOMAIN`, commit
   and let `main` redeploy. (Edit them there, not only in the dashboard: a deploy overwrites
   dashboard variables.)
6. Open the Worker URL, sign in with a one-time code; the page shows "Signed in as ..." in its header.

## Running it locally

```bash
bun install
bun run --cwd apps/admin build                                  # the page the Worker serves
cd apps/api
printf 'ALLOW_DEV_IDENTITY=dev@localhost\n' > .dev.vars        # gitignored
bunx wrangler d1 migrations apply disalytics-lineups --local --config wrangler.admin.jsonc
bun run --cwd ../.. lineups:seed -- --local                    # the Mirage built-ins, optional
bun run dev:admin                                               # http://localhost:8788
```

`ALLOW_DEV_IDENTITY` is honoured only when the request host is `localhost`, `127.0.0.1` or `[::1]`.
A deployed Worker is reached on its `workers.dev` host and the variable is not in the deployed config
(`.dev.vars` is not deployed), so the bypass cannot be used in production. The local database lives
in `apps/api/.wrangler/` and never touches the remote D1 or KV. For hot reload of the page run
`bun run --cwd apps/admin dev` too and open `http://localhost:5174`; it proxies `/api` to 8788.

```bash
bun run --cwd apps/api test       # Worker: verifier, planning, commit, routes (real SQLite)
bun run --cwd apps/admin test     # page helpers
bun run --cwd apps/admin build    # typecheck, build, wrangler deploy --dry-run
```

## Photos

Embedded and copied photos are stored in KV under the SHA-256 of their bytes and linked as
`https://disalytics-api.disa-67b.workers.dev/photos/<sha256>` (`PHOTO_BASE_URL`). Content addressing
makes a repeated upload harmless. Free-plan ceilings (1,000 KV writes a day) are the reason to keep
"copy link photos" for the first import and not for every run.
