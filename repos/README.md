# repos/

Read-only upstream source for development reference. Application code imports published dependencies,
never files from this directory. The tree is excluded from formatting, typechecking, builds and
codebase-memory indexing.

| Path | Upstream | Revision | Used package |
|---|---|---|---|
| `effect/` | `https://github.com/Effect-TS/effect.git` | `effect@4.0.0-rc.117` (`14a3f140095fdebbff9162944fe7d4ea83e054e6`) | `effect@4.0.0-rc.117` in `apps/api` |

When changing the installed Effect version, resolve the matching `effect@<version>` Git tag and
update the subtree with `git subtree pull --prefix=repos/effect https://github.com/Effect-TS/effect.git 'effect@<version>' --squash`.
Keep `apps/api/package.json` and this table in sync. Read `repos/effect/LLMS.md` before implementing
Effect code; do not edit the subtree or import from it.
