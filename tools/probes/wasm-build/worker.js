import init, {
  probe,
  ping,
  grow,
  env_check,
  clock_check,
  linear_memory_bytes,
} from './pkg/wasm_build_probe.js';

const post = (message) => self.postMessage(message);

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;

// Reading memory is itself a call into the instance, so it throws once the instance has trapped.
const memory = () => {
  try {
    return mb(linear_memory_bytes());
  } catch {
    return 'unreadable';
  }
};

const attempt = (label, fn) => {
  const before = memory();
  const started = performance.now();
  let report;
  try {
    report = fn();
  } catch (error) {
    report = `THREW: ${error}`;
  }
  const ms = performance.now() - started;
  post({ type: 'stage', label, ms, report: `${report}\nlinear memory ${before} -> ${memory()}` });
};

const STAGES = ['header only', 'events', 'per-tick props', 'projectiles'];

// Step order is load-bearing, not stylistic. The parse stages run first, in an instance that has
// not been grown, because WASM linear memory never shrinks and an earlier large allocation
// distorts their timings. clock_check runs last because it traps, and a trapped instance rejects
// every later call.
self.onmessage = async () => {
  try {
    await init();

    const response = await fetch('./fixture.dem');
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    post({ type: 'progress', text: `fetched ${buffer.byteLength} bytes` });

    attempt('boundary copy — full fixture', () => ping(bytes));

    for (let stage = 0; stage < STAGES.length; stage++) {
      attempt(`stage ${stage} — ${STAGES[stage]}`, () => probe(bytes, stage));
    }

    attempt('stage 0 — header only, 1 MB slice', () => probe(bytes.subarray(0, 1024 * 1024), 0));

    attempt('std::env::var', () => env_check());
    attempt('grow 2048 MB — distorts any later timing', () => grow(2048));
    attempt('std::time::Instant::now — traps and poisons the instance, must run last', () =>
      clock_check(),
    );

    post({ type: 'done' });
  } catch (error) {
    post({ type: 'error', message: String(error && error.stack ? error.stack : error) });
  }
};
