# Sample matches

Two maps of one professional match, as **parsed containers** rather than as demos, so somebody with
no `.dem` to hand can still open the product and see what it does — `ROADMAP.md` M7's first row.

**Source:** the IEM Atlanta 2026 series between Natus Vincere and Vitality, published by
[HLTV](https://www.hltv.org/) as it is for every match it covers. The players are professionals
whose names, teams and statistics are broadcast, recorded and republished as a matter of course,
which is what makes shipping this parse different from shipping anybody's own recording — and it is
the answer the owner gave on 6 September 2026 to the question `ROADMAP.md` had been holding.

**What is here and what is not.** `AGENTS.md`'s constraints table forbids committing a `.dem` at
all. What these files hold is the *output* of parsing one — the same container `packages/demo-store`
writes into OPFS after any parse — at **2.89 MiB** (inferno) and **3.90 MiB** (dust2) gzipped,
against Cloudflare's hard 25 MiB per static asset. The demos they were built from are 380 MB and
462 MB and stay on the owner's machine.

## Rebuilding them

```bash
DISALYTICS_SAMPLE_DIR=<the directory holding the .dem files> bun run samples:generate
```

It rewrites both containers and `apps/web/src/core/samples/generated/assets.ts`, and is byte-stable
across runs — the parse is deterministic by hard rule 8, and the gzip carries no timestamp.

**Every `SCHEMA_VERSION` bump needs one.** A container names the schema it was written under and
`decodeDemo` refuses any other, so a bumped version makes both of these unreadable on the day it
lands. `bun run samples:check` is what turns that from a card that fails when pressed into a red
build, and it runs in `ci.yml`; CI cannot fix it, because CI has no demos.

## Two, not three

The series is a BO3 and the third map (anubis, 4.32 MiB gzipped) is deliberately not here. Every
regeneration lands in the repository's history again, and two maps is what the owner chose that
weight for. Adding it back is one row in
[`catalogue.ts`](../../src/core/samples/helpers/catalogue.ts) and one run of the generator.
