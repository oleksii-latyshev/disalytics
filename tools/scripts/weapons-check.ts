import { DAMAGE_SOURCES, WEAPON_IDS } from '@disa/demo-core';

const RUST_PATH = 'crates/demo-parser/src/vocabulary.rs';

function listIn(source: string, name: string): string[] {
  const body = new RegExp(`const ${name}: &\\[&str\\] = &\\[([^\\]]*)\\];`).exec(source)?.[1];
  if (body === undefined) return [];
  return [...body.matchAll(/"([a-z0-9_]+)"/g)].flatMap(([, id]) => (id === undefined ? [] : [id]));
}

function report(title: string, ids: string[]): void {
  if (ids.length === 0) return;
  console.error(`\n${title}`);
  for (const id of ids) console.error(`  ${id}`);
}

const source = await Bun.file(RUST_PATH).text();

const vocabularies: readonly [string, string[], readonly string[]][] = [
  ['WEAPON_IDS', listIn(source, 'WEAPON_IDS'), WEAPON_IDS],
  ['DAMAGE_SOURCES', listIn(source, 'DAMAGE_SOURCES'), DAMAGE_SOURCES],
];

let failed = false;
for (const [name, rust, typescript] of vocabularies) {
  if (rust.length === 0) {
    console.error(`No ${name} found in ${RUST_PATH}.`);
    console.error('A parity check that matches nothing passes for the wrong reason — fix it.');
    process.exit(1);
  }

  report(
    `Missing from ${name} in packages/demo-core/src/schema.ts:`,
    rust.filter((id) => !typescript.includes(id)),
  );
  report(
    `Missing from ${name} in ${RUST_PATH}:`,
    typescript.filter((id) => !rust.includes(id)),
  );

  if (rust.join() !== typescript.join()) {
    console.error(`\n${name} must match identifier for identifier, in order.`);
    failed = true;
  }
}

if (failed) process.exit(1);

console.log(
  `${WEAPON_IDS.length} weapon ids and ${DAMAGE_SOURCES.length} damage sources, Rust and TypeScript in parity.`,
);
