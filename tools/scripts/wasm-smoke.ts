import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PKG_DIR = 'crates/demo-parser-wasm/pkg';
const GLUE_PATH = `${PKG_DIR}/demo_parser_wasm.js`;
const BINARY_PATH = `${PKG_DIR}/demo_parser_wasm_bg.wasm`;
const FIXTURE_ENV = 'DISALYTICS_FIXTURE_DEMO';
const EXPECTED_PASSES = 3;

// A binary whose entry point traps has its unreachable code eliminated and then measures tiny —
// docs/PARSER.md §8 recorded 293 KB that looked like a win and held no parser at all. Weighing the
// file cannot tell those apart. Calling into it can.
const NOT_A_DEMO = new Uint8Array(64);
NOT_A_DEMO.set(new TextEncoder().encode('NOTADEM\0'));

// The zstd frame magic. A container is recognised by these four bytes and never by a file name, so
// this is all it takes to make the buffer answer that it needs expanding.
const ZSTD_MAGIC = new Uint8Array([0x28, 0xb5, 0x2f, 0xfd, 0x00, 0x00, 0x00, 0x00]);

// The glue is generated into a gitignored `pkg/`, so it cannot be a typed static import: a fresh
// clone has to typecheck before any binary exists. Every value read from it is `unknown` and
// checked before use. This is also what keeps packages/demo-parser/src/wasm-glue.d.ts honest —
// that declaration is written by hand, and nothing but this script calls what it claims exists.
type DemoBuffer = {
  push(chunk: Uint8Array): void;
  readonly byteLength: number;
  readonly isCompressed: boolean;
};

type WasmExports = {
  default: (init: { module_or_path: ArrayBuffer }) => Promise<unknown>;
  parserVersion: () => unknown;
  passCount: () => unknown;
  eventNames: (demoBytes: Uint8Array) => unknown;
  DemoBuffer: new (sizeBytes: number) => DemoBuffer;
  parseDemo: (
    demo: DemoBuffer,
    onPass: (completedPasses: number) => void,
    onHeader: (header: unknown) => void,
  ) => unknown;
};

type Buffered = {
  length: number;
  byteLength: number;
  buffer: ArrayBufferLike;
};

function fail(message: string): never {
  console.error(`\n${message}`);
  process.exit(1);
}

function thrownBy(call: () => unknown): string | undefined {
  try {
    call();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  return undefined;
}

function field(owner: unknown, name: string): unknown {
  if (typeof owner !== 'object' || owner === null || !(name in owner)) {
    fail(`the parsed demo has no ${name}.`);
  }

  return Reflect.get(owner, name);
}

function numberField(owner: unknown, name: string): number {
  const value = field(owner, name);

  if (typeof value !== 'number') fail(`${name} is ${String(value)} rather than a number.`);

  return value;
}

function arrayField(owner: unknown, name: string): unknown[] {
  const value = field(owner, name);

  if (!Array.isArray(value)) fail(`${name} is not an array.`);

  return value;
}

/**
 * A typed array of `length` items that owns its buffer. Owning it is the whole point: a view into
 * linear memory would report the module's whole heap as its buffer, could not be transferred, and
 * would be freed under the main thread the moment the worker was terminated.
 */
function bufferField(
  owner: unknown,
  name: string,
  kind: new (length: number) => Buffered,
  length: number,
): void {
  const value = field(owner, name);

  if (!(value instanceof kind)) fail(`${name} is not a ${kind.name}.`);
  if (value.length !== length) fail(`${name} holds ${value.length} items rather than ${length}.`);
  if (value.buffer.byteLength !== value.byteLength) {
    fail(`${name} is a view into linear memory, not a buffer the worker can transfer.`);
  }
}

if (!existsSync(GLUE_PATH) || !existsSync(BINARY_PATH)) {
  fail(`No built package in ${PKG_DIR} — run \`bun run wasm:build\` first.`);
}

const glue: WasmExports = await import(resolve(GLUE_PATH));

for (const name of ['default', 'parserVersion', 'passCount', 'eventNames', 'parseDemo'] as const) {
  if (typeof glue[name] !== 'function') {
    fail(`${GLUE_PATH} is not the generated glue — it is missing ${name}.`);
  }
}

if (typeof glue.DemoBuffer !== 'function') {
  fail(`${GLUE_PATH} is missing the DemoBuffer class.`);
}

// Left to itself the glue fetches the binary from a URL beside it, which needs a server. Handing
// over the bytes is what lets this run as an ordinary script.
await glue.default({ module_or_path: await Bun.file(BINARY_PATH).arrayBuffer() });

const version: unknown = glue.parserVersion();

if (typeof version !== 'string' || version.length === 0) {
  fail(`parserVersion() returned ${String(version)} rather than a version.`);
}

const passes: unknown = glue.passCount();

if (passes !== EXPECTED_PASSES) {
  fail(`passCount() returned ${String(passes)}; docs/PARSER.md §3 measured ${EXPECTED_PASSES}.`);
}

for (const [name, call] of [
  ['eventNames', () => glue.eventNames(NOT_A_DEMO)],
  [
    'parseDemo',
    () => {
      const demo = new glue.DemoBuffer(NOT_A_DEMO.length);
      demo.push(NOT_A_DEMO);
      return glue.parseDemo(demo, noop, noop);
    },
  ],
] as const) {
  const thrown = thrownBy(call);

  if (thrown === undefined) fail(`${name}() accepted a file that is not a demo.`);
  if (thrown !== 'NOT_A_DEMO') {
    fail(
      `${name}() threw ${thrown} rather than NOT_A_DEMO.\n` +
        'An "unreachable" here is the unpatched Instant::now() on the second line of ' +
        'Parser::parse_demo — docs/PARSER.md §8 and vendor/README.md.',
    );
  }
}

function noop(): void {}

function bufferOf(bytes: Uint8Array): DemoBuffer {
  const buffer = new glue.DemoBuffer(bytes.length);
  buffer.push(bytes);

  return buffer;
}

if (bufferOf(NOT_A_DEMO).isCompressed) {
  fail('isCompressed called an uncompressed file a container.');
}

if (!bufferOf(ZSTD_MAGIC).isCompressed) {
  fail('isCompressed did not recognise the zstd magic, so the worker would name the wrong phase.');
}

console.log(`parserVersion() -> ${version}, passCount() -> ${passes}, a non-demo -> NOT_A_DEMO.`);

const fixturePath = process.env[FIXTURE_ENV];

if (fixturePath === undefined) {
  console.log(`Set ${FIXTURE_ENV} to a .dem to check the parsed shape against a real demo.`);
  process.exit(0);
}

const file = Bun.file(fixturePath);
const demo = new glue.DemoBuffer(file.size);
const reader = file.stream().getReader();
let chunk = await reader.read();

while (!chunk.done) {
  demo.push(chunk.value);
  chunk = await reader.read();
}

if (demo.byteLength !== file.size) {
  fail(`the buffer holds ${demo.byteLength} bytes of a ${file.size}-byte demo.`);
}

const reported: number[] = [];
const headers: unknown[] = [];
const started = Bun.nanoseconds();
const parsed = glue.parseDemo(
  demo,
  (completedPasses) => reported.push(completedPasses),
  (header) => headers.push(header),
);
const seconds = (Bun.nanoseconds() - started) / 1e9;

if (reported.join() !== '1,2,3') {
  fail(`progress arrived as [${reported.join(', ')}] rather than one report per pass.`);
}

if (headers.length !== 1) {
  fail(`the header was reported ${headers.length} times rather than once.`);
}

const [header] = headers;
const map = field(header, 'map');

if (typeof map !== 'string' || map.length === 0) fail(`the header names no map.`);
if (arrayField(header, 'players').length === 0) fail('the header holds no players.');
if (arrayField(header, 'weapons').length === 0) fail('the header holds no weapon table.');

const track = field(parsed, 'track');
const cells = numberField(track, 'frameCount') * numberField(track, 'slotCount');

bufferField(track, 'posX', Float32Array, cells);
bufferField(track, 'posY', Float32Array, cells);
bufferField(track, 'posZ', Float32Array, cells);
bufferField(track, 'yaw', Int16Array, cells);
bufferField(track, 'pitch', Int16Array, cells);
bufferField(track, 'health', Uint8Array, cells);
bufferField(track, 'flags', Uint8Array, cells);
bufferField(track, 'speed', Uint16Array, cells);
bufferField(track, 'armour', Uint8Array, cells);
bufferField(track, 'weapon', Uint8Array, cells);
bufferField(track, 'grenades', Uint8Array, cells);
bufferField(track, 'money', Uint16Array, cells);

const events = field(parsed, 'events');
const grenades = arrayField(events, 'grenades');

for (const name of ['rounds', 'kills', 'damage', 'blinds', 'plants', 'defuses'] as const) {
  arrayField(events, name);
}

for (const grenade of grenades) {
  const trajectory = field(grenade, 'trajectory');
  const samples = numberField(trajectory, 'sampleCount');

  bufferField(trajectory, 'x', Float32Array, samples);
  bufferField(trajectory, 'y', Float32Array, samples);
  bufferField(trajectory, 'z', Float32Array, samples);
}

console.log(
  `${map}: ${cells} track cells and ${grenades.length} grenades in ${seconds.toFixed(2)}s, ` +
    'every buffer owned by JavaScript.',
);
