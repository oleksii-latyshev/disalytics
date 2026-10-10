# API Worker

This Cloudflare Worker is a separate deployment from the replay PWA. Replay files and parsed replay
data stay in the browser; no route here accepts them. It answers `GET /health`, `GET /lineups`, `GET /lineups/:map`
and `GET /photos/:sha256`; there are no write routes.
Production: <https://disalytics-api.disa-67b.workers.dev>.

From the repository root:

```bash
bun install
bun run --cwd apps/api dev
bun run --cwd apps/api typecheck
bun run --cwd apps/api test
bun run --cwd apps/api build
```

`build` is a Wrangler dry run: it checks the deployable Worker bundle without publishing it. The
Worker configuration is `apps/api/wrangler.jsonc`; the static site keeps the root `wrangler.jsonc`.
The API is deployed by its own job in `.github/workflows/deploy.yml` after green `ci` on `main`; the
job runs `bun run api:smoke <url>` against the deployed Worker. For a manual deploy, run
`cd apps/api && bunx wrangler deploy` after reviewing the Cloudflare account and credentials.
The API can use the [Workers Free plan](https://developers.cloudflare.com/workers/platform/pricing/)
without a persistent server; its request and CPU quotas are account-level constraints. This setup
stays inside the free tiers of D1 and Workers KV; nothing here can bill (R2 needs a payment method, so
photos live in KV).

The Worker entry point dispatches to domain routers under `src/modules/`. The upload module keeps
provider calls, bounded body reads, validation, CORS, and constants in focused helpers. Shared HTTP
response shaping lives under `src/shared/`. The same `CODE_REQUIREMENTS.md` rules apply to this app.

## Lineups and photos

| Route | Answers |
|---|---|
| `GET /lineups` | `{ maps: [{ map, revision, count }] }`: the live count and revision of each map, so a client fetches only the maps that moved. Same `Cache-Control` as a map. |
| `GET /lineups/:map` | `{ map, revision, lineups, collections }`; `:map` is `de_[a-z0-9_]+`. Rows failing `isLineup` or `isLineupCollection` are skipped and the rest are marked `isBuiltIn`; a collection is served without members whose lineup is gone. An older client ignores `collections`. `Cache-Control: max-age=60, stale-while-revalidate=600`, `ETag` on the map's revision, `304` on a match, edge-cached with the Cache API. |
| `GET /photos/:sha256` | image bytes from KV (type in KV metadata), lowercase hex-64 only, `immutable` for a year, otherwise `404`. |

CORS (GET) is allowed for the web origin and `localhost`/`127.0.0.1` dev origins only.

Bindings (`wrangler.jsonc`): D1 `LINEUPS_DB` (`disalytics-lineups`) and KV `LINEUP_PHOTOS`
(`disalytics-lineup-photos`).

### Structure

- `src/api.ts` defines the whole HTTP surface with Effect `HttpApi` (path params are `Schema`s, so
  a malformed id is a `404 not_found`); each `modules/<x>/api.ts` holds one group and
  `handlers.ts` its implementation.
- `src/app.ts` builds the router (handlers, a catch-all `404`, the CORS / `304` / edge-cache
  middleware in `shared/http/middleware.ts`) and `handle(request, env, cache)` passes this request's
  bindings in as services.
- `src/db/schema.ts` is the Drizzle schema: `lineups` (one row per lineup, JSON `body`, soft
  delete), `lineup_revisions` (one counter per map, so an edit only invalidates its own map's ETag
  and cache) `lineup_collections` (the map's built-in collections, same row shape as `lineups`; a write bumps the same
  revision) and `lineup_changes` (append-only log for the admin Worker; a collection's rows have an action
  starting `collection:`).
- `LineupStorage` (`modules/lineups/storage.ts`) and `PhotoStorage` (`modules/photos/storage.ts`)
  are Effect services built from a binding (`makeLineupStorage(env.LINEUPS_DB)`,
  `makePhotoStorage(env.LINEUP_PHOTOS)`). The admin Worker (#616) imports them; every write goes
  through them so the revision is bumped and logged. There is no write route here.

### Changing the schema

Edit `src/db/schema.ts`, run `bun run --cwd apps/api db:generate`, review the new
`migrations/NNNN_*.sql`, commit it with `migrations/meta/`, then apply it with
`bunx wrangler d1 migrations apply disalytics-lineups --remote` (`--local` for `wrangler dev`).
`0001_lineups.sql` was written by hand before Drizzle and is the baseline; the snapshot in
`migrations/meta/` matches it, so `db:generate` prints "nothing to migrate" until the schema changes.
Never edit or rename an applied migration.

Tests run the real migration on in-memory SQLite (`node:sqlite`, Node 22.13+; they skip where it is
missing).

Migrations and seeding are manual (deploy does not run them):

```bash
cd apps/api && bunx wrangler d1 migrations apply disalytics-lineups --remote
bun run lineups:seed -- --remote     # --local for wrangler dev, --print for the SQL
```

Seeding loads `packages/map-data/src/lineups/*.json` with `INSERT OR IGNORE`, so it never overwrites
an admin edit; until a map is seeded the client keeps its bundled snapshot. Free-plan ceilings: KV
1,000 writes and 100,000 reads a day and 1 GB; D1 100,000 row writes and 5 million row reads a day;
the 60 s edge cache keeps reads far below them. The web app reads the API from
`VITE_DISALYTICS_API_URL` (default: production).

## Future provider routes

Keep provider keys in Cloudflare Worker secrets, never in the web bundle or committed environment
files. A public statistics route will need input validation, bounded upstream requests and a stable
error shape. Allow the web app's origin explicitly when adding browser-facing CORS. Cache successful
public responses with a short TTL using Cloudflare's Cache API before adding a separate storage
service; the cache is local to each Cloudflare data center, so an upstream miss can still occur in
another location. Do not cache authenticated or personal responses. The
health route sends `Cache-Control: no-store`.

## Lineup photos

There is no upload route. Catbox rejects anonymous uploads from Cloudflare's egress
(`412 Invalid uploader`), and uploading under a project account would make the project answerable
for whatever visitors post. The web app submits the photo to Catbox from the visitor's own browser
in a new tab; the visitor pastes the returned link back.
