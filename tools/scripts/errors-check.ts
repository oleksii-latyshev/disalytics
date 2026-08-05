import { ERROR_CODES } from '@disa/demo-core';

const RUST_PATH = 'crates/demo-parser/src/error.rs';

// Only `ErrorCode::as_str` maps a variant to a string; `ParseError::code` maps one enum to the
// other, so it cannot match this shape.
const AS_STR_ARM = /Self::\w+\s*=>\s*"([A-Z0-9_]+)"/g;

function identifiersIn(source: string): string[] {
  const found: string[] = [];
  for (const [, identifier] of source.matchAll(AS_STR_ARM)) {
    if (identifier !== undefined) found.push(identifier);
  }
  return found;
}

function report(title: string, codes: string[]): void {
  if (codes.length === 0) return;
  console.error(`\n${title}`);
  for (const code of codes) console.error(`  ${code}`);
}

const rust = identifiersIn(await Bun.file(RUST_PATH).text());

if (rust.length === 0) {
  console.error(`No error identifiers found in ${RUST_PATH}.`);
  console.error('A parity check that matches nothing passes for the wrong reason — fix it.');
  process.exit(1);
}

const typescript: string[] = [...ERROR_CODES];

report(
  'Missing from packages/demo-core/src/errors.ts:',
  rust.filter((code) => !typescript.includes(code)),
);
report(
  `Missing from ${RUST_PATH}:`,
  typescript.filter((code) => !rust.includes(code)),
);

if (rust.join() !== typescript.join()) {
  console.error('\nThe two error vocabularies must match identifier for identifier, in order.');
  console.error(`  ${RUST_PATH}: ${rust.join(', ')}`);
  console.error(`  packages/demo-core/src/errors.ts: ${typescript.join(', ')}`);
  process.exit(1);
}

console.log(`${rust.length} error codes, Rust and TypeScript in parity.`);
