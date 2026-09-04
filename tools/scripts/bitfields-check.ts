/**
 * The two bitfields `TickTrack` carries are written in Rust and read in TypeScript, and both files
 * say "must stay in sync with" the other and nothing enforced it. Drift here is silent and wrong
 * rather than broken: a bit that means "scoped" on one side and "defusing" on the other draws a
 * plate nobody can tell is lying.
 *
 * `SCHEMA_VERSION` is deliberately not checked, because the crate owns no copy of it — it is
 * TypeScript's alone (`packages/demo-core/src/schema.ts`), and `crates/demo-parser/src/schema.rs`
 * names it only in prose. Should the crate ever mint its own constant, it belongs here.
 */

const TS_PATH = 'packages/demo-core/src/schema.ts';
const RUST_PATH = 'crates/demo-parser/src/schema.rs';

// Both sides spell a bit as a shift, and the shift is the half worth comparing: a check over names
// alone passes two lists that disagree about which bit `FLAG_WALKING` is.
const TS_BIT = /export const ((?:FLAG|GRENADE)_[A-Z0-9_]+) = 1 << (\d+);/g;
const RUST_BIT = /pub const ((?:FLAG|GRENADE)_[A-Z0-9_]+): u8 = 1 << (\d+);/g;

function bitsIn(source: string, pattern: RegExp): string[] {
  const found: string[] = [];
  for (const [, name, shift] of source.matchAll(pattern)) {
    if (name !== undefined && shift !== undefined) found.push(`${name} = 1 << ${shift}`);
  }
  return found;
}

function report(title: string, bits: string[]): void {
  if (bits.length === 0) return;
  console.error(`\n${title}`);
  for (const bit of bits) console.error(`  ${bit}`);
}

const rust = bitsIn(await Bun.file(RUST_PATH).text(), RUST_BIT);
const typescript = bitsIn(await Bun.file(TS_PATH).text(), TS_BIT);

for (const [path, bits] of [
  [RUST_PATH, rust],
  [TS_PATH, typescript],
] as const) {
  if (bits.length > 0) continue;
  console.error(`No FLAG_* or GRENADE_* constants found in ${path}.`);
  console.error('A parity check that matches nothing passes for the wrong reason — fix it.');
  process.exit(1);
}

report(
  `Missing from ${TS_PATH}, or written with a different bit:`,
  rust.filter((bit) => !typescript.includes(bit)),
);
report(
  `Missing from ${RUST_PATH}, or written with a different bit:`,
  typescript.filter((bit) => !rust.includes(bit)),
);

if (rust.join() !== typescript.join()) {
  console.error('\nThe two bitfields must match name for name and bit for bit, in order.');
  console.error(`  ${RUST_PATH}: ${rust.join(', ')}`);
  console.error(`  ${TS_PATH}: ${typescript.join(', ')}`);
  process.exit(1);
}

console.log(`${rust.length} bits, Rust and TypeScript in parity.`);
