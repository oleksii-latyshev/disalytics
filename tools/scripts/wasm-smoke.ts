import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PKG_DIR = 'crates/demo-parser-wasm/pkg';
const GLUE_PATH = `${PKG_DIR}/demo_parser_wasm.js`;
const BINARY_PATH = `${PKG_DIR}/demo_parser_wasm_bg.wasm`;

// A binary whose entry point traps has its unreachable code eliminated and then measures tiny —
// docs/PARSER.md §8 recorded 293 KB that looked like a win and held no parser at all. Weighing the
// file cannot tell those apart. Calling into it can.
const NOT_A_DEMO = new Uint8Array(64);
NOT_A_DEMO.set(new TextEncoder().encode('NOTADEM\0'));

// The glue is generated into a gitignored `pkg/`, so it cannot be a typed static import: a fresh
// clone has to typecheck before any binary exists. Every value read from it is `unknown` and
// checked before use.
type WasmExports = {
  default: (init: { module_or_path: ArrayBuffer }) => Promise<unknown>;
  parserVersion: () => unknown;
  eventNames: (demoBytes: Uint8Array) => unknown;
};

function fail(message: string): never {
  console.error(`\n${message}`);
  process.exit(1);
}

if (!existsSync(GLUE_PATH) || !existsSync(BINARY_PATH)) {
  fail(`No built package in ${PKG_DIR} — run \`bun run wasm:build\` first.`);
}

const glue: WasmExports = await import(resolve(GLUE_PATH));

if (
  typeof glue.default !== 'function' ||
  typeof glue.parserVersion !== 'function' ||
  typeof glue.eventNames !== 'function'
) {
  fail(`${GLUE_PATH} is not the generated glue — it is missing one of its exports.`);
}

// Left to itself the glue fetches the binary from a URL beside it, which needs a server. Handing
// over the bytes is what lets this run as an ordinary script.
await glue.default({ module_or_path: await Bun.file(BINARY_PATH).arrayBuffer() });

const version: unknown = glue.parserVersion();

if (typeof version !== 'string' || version.length === 0) {
  fail(`parserVersion() returned ${String(version)} rather than a version.`);
}

let thrown: string | undefined;

try {
  glue.eventNames(NOT_A_DEMO);
} catch (error) {
  thrown = error instanceof Error ? error.message : String(error);
}

if (thrown === undefined) {
  fail('eventNames() accepted a file that is not a demo. It should have thrown NOT_A_DEMO.');
}

if (thrown !== 'NOT_A_DEMO') {
  fail(
    `eventNames() threw ${thrown} rather than NOT_A_DEMO.\n` +
      'An "unreachable" here is the unpatched Instant::now() on the second line of ' +
      'Parser::parse_demo — docs/PARSER.md §8 and vendor/README.md.',
  );
}

console.log(`parserVersion() -> ${version}, eventNames() -> ${thrown}. The binary runs.`);
