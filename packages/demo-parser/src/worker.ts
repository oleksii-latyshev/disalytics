/// <reference lib="webworker" />

import init, { DemoBuffer, parseDemo, passCount } from 'demo-parser-wasm';
import { errorCodeOf } from './errors';
import type { DemoSource, WorkerIn, WorkerOut } from './protocol';
import { fileOf, streamInto } from './source';
import { transferablesOf } from './transfer';

function post(message: WorkerOut, transfer: ArrayBuffer[] = []): void {
  postMessage(message, transfer);
}

async function run(source: DemoSource): Promise<void> {
  await init();
  post({ type: 'progress', phase: 'parse', percent: 0 });

  const file = await fileOf(source);
  const demo = new DemoBuffer(file.size);
  await streamInto(file, demo);

  // Decompression happens inside the first `parseDemo` call and reports nothing from in there, so
  // the phase is named before the call rather than during it. The container is read on the Rust
  // side because that is where the magic bytes are already known.
  if (demo.isCompressed) post({ type: 'progress', phase: 'decompress', percent: 0 });

  const totalPasses = passCount();
  const { track, events } = parseDemo(
    demo,
    (completedPasses) =>
      post({
        type: 'progress',
        phase: 'parse',
        percent: Math.round((completedPasses / totalPasses) * 100),
      }),
    (header) => post({ type: 'header', header }),
  );

  post({ type: 'done', track, events }, transferablesOf(track, events));
}

self.onmessage = async (event: MessageEvent<WorkerIn>) => {
  try {
    await run(event.data.source);
  } catch (thrown) {
    post({ type: 'error', code: errorCodeOf(thrown) });
  }
};
