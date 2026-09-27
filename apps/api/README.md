# API Worker

This Cloudflare Worker is a separate deployment from the replay PWA. Replay files and parsed replay
data stay in the browser; no route here accepts them. It answers `GET /health` and serves the
lineup image routes described below.
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

## Lineup photo uploads

`GET /images/config` returns the public Turnstile site key when uploads are configured.
`POST /images/upload` accepts a multipart form with one `image` WebP file (at most 2 MiB) and
one `turnstile` token. It returns `{ "url": "https://files.catbox.moe/..." }` on success.
Only the production web origin and local Vite development origins receive CORS access.
Origin checks do not authenticate callers; Turnstile and the rate limit protect the public route.
The route verifies the single-use Turnstile token, rate limits to three attempts per minute per
Cloudflare location and visitor IP, checks WebP magic bytes, then posts to Catbox. Rate limiting
is a brake, not an accurate global quota.

Provision a dedicated Catbox account in the [Catbox web UI](https://catbox.moe/) and get its
userhash from the account management page. Catbox documents `userhash` on its
[API tools page](https://catbox.moe/tools.php); there is no documented account-creation API.
In [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/get-started/), create a
Managed widget named for lineup uploads and authorize `disalytics.disa-67b.workers.dev`.
Cloudflare's [Free plan](https://developers.cloudflare.com/turnstile/plans/) currently includes
20 widgets and unlimited challenges. Use a separate widget for localhost development if needed.
The widget gives you a public sitekey and a private secret key. Set `TURNSTILE_SITE_KEY` as a Worker
variable and store `CATBOX_USERHASH` and `TURNSTILE_SECRET` as Worker secrets with
`wrangler secret put`.
`keep_vars` in the Worker configuration preserves the dashboard variable on later CI deploys.
The endpoint remains unavailable until all three values are set. Never put the hash or secret
in a `VITE_*` variable or commit them.

From `apps/api`, run `bunx wrangler secret put CATBOX_USERHASH` and paste the hash at its prompt;
repeat with `TURNSTILE_SECRET`. A secret binding is delivered in the Worker's `env` argument at
request time. Set the public `TURNSTILE_SITE_KEY` in the Worker's dashboard Variables and Secrets.
For local development, put the same names in an ignored `apps/api/.dev.vars` file. Do not paste
secret values into shell command arguments, source files, or a pull request.

For deletion, use the Catbox account's management UI or call its `deletefiles` API privately,
passing the userhash and a space-separated list of file basenames. No public deletion endpoint is
exposed. Removing a lineup from the local IndexedDB store does not delete its Catbox files; users
can also share the same image link across lineups, so automatic deletion would need reference
tracking and ownership rules.

The upload guard does not inspect whether a picture violates Catbox's content rules. Catbox says
it may delete offending files, purge an account, and blacklist an IP. Keep the dedicated account
separate from personal files, review its uploads, and disable the Worker secrets if abuse appears.
Catbox also requires prior approval for commercial hotlinking; confirm the intended usage with
Catbox before using it for a monetized service. A generic URL fetch/proxy route must not be added.
