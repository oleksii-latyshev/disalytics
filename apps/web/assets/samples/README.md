# Sample matches

Two maps of one professional match, as **parsed containers** rather than as demos, so somebody with
no `.dem` to hand can still open the product and see what it does — `ROADMAP.md` M7's first row.

**Source:** an ESL series between Falcons and Natus Vincere (EVENT_TBD), maps one and two, published
by [HLTV](https://www.hltv.org/) as it is for every match it covers. It replaced the IEM Atlanta 2026
NaVi–Vitality pair on 18 October 2026, whose source demos were lost. The players are professionals
whose names, teams and statistics are broadcast, recorded and republished as a matter of course,
which is what makes shipping this parse different from shipping anybody's own recording — and it is
the answer the owner gave on 6 September 2026 to the question `ROADMAP.md` had been holding.

**What is here and what is not.** `AGENTS.md`'s constraints table forbids committing a `.dem` at
all. What these files hold is the *output* of parsing one — the same container `packages/demo-store`
writes into OPFS after any parse — at **3.75 MiB** (inferno) and **5.85 MiB** (anubis, 34 rounds with overtime) gzipped,
against Cloudflare's hard 25 MiB per static asset. The demos they were built from are 418 MB and
632 MB and stay on the owner's machine.

## Rebuilding them

```bash
DISALYTICS_SAMPLE_DIR=<the directory holding the .dem files> bun run samples:generate
```

It rewrites both containers and `apps/web/src/core/samples/generated/assets.ts`, and is byte-stable
across runs — the parse is deterministic by hard rule 8, and the gzip carries no timestamp.

**The way in's reel is cut from these bytes, so a rebuild here needs one there too.** `#335`'s
background plays one round of the inferno container, and `bun run reel:generate` reads that container
rather than any `.dem` — so regenerating the reel needs nothing but this directory. Run it after
`samples:generate`, and `bun run reel:check` will refuse the build until you have: it rebuilds the
reel from the container and compares, which is the staleness check and the byte-stability claim in
one run.

**Every `SCHEMA_VERSION` bump needs one.** A container names the schema it was written under and
`decodeDemo` refuses any other, so a bumped version makes both of these unreadable on the day it
lands. `bun run samples:check` is what turns that from a card that fails when pressed into a red
build, and it runs in `ci.yml`; CI cannot fix it, because CI has no demos.

## Two maps

Every regeneration lands in the repository's history again, and two maps is what the owner chose that
weight for. Another map is one row in
[`catalogue.ts`](../../src/core/samples/helpers/catalogue.ts) and one run of the generator.
