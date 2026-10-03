# API Worker

This Cloudflare Worker is a separate deployment from the replay PWA. Replay files and parsed replay
data stay in the browser; no route here accepts them. It answers `GET /health`.
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
does not provision KV, a database or a paid service.

The Worker entry point dispatches to domain routers under `src/modules/`. The upload module keeps
provider calls, bounded body reads, validation, CORS, and constants in focused helpers. Shared HTTP
response shaping lives under `src/shared/`. The same `CODE_REQUIREMENTS.md` rules apply to this app.

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
