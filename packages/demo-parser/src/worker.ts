/// <reference lib="webworker" />

import init, { DemoBuffer, parseDemo } from 'demo-parser-wasm';
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

  // The phase and the percentage are both the parser's: it knows when the container is open and how
  // far into the demo each pass has read, and it reports a percentage only when it changes.
  const { track, events } = parseDemo(
    demo,
    (phase, percent) => post({ type: 'progress', phase, percent }),
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
