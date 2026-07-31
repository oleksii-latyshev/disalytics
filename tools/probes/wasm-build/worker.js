import init, { probe, ping, grow, env_check, clock_check } from './pkg/wasm_build_probe.js';

const post = (message) => self.postMessage(message);

const attempt = (label, fn) => {
  const started = performance.now();
  let report;
  try {
    report = fn();
  } catch (error) {
    report = `THREW: ${error}`;
  }
  post({ type: 'stage', label, ms: performance.now() - started, report });
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
