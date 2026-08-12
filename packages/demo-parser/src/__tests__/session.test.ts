import type { MatchHeader } from '@disa/demo-core';
import { asPlayerSlot } from '@disa/demo-core';
import { newEvents, newTrack } from '@disa/demo-core/test-helpers';
import { describe, expect, it } from 'vitest';
import { DemoParseError } from '../errors';
import type { ParsePhase, WorkerIn, WorkerOut } from '../protocol';
import { type ParseWorker, runParse } from '../session';

const HEADER: MatchHeader = {
  map: 'de_mirage',
  tickRate: 64,
  players: [{ slot: asPlayerSlot(0), steamId: '76561198000000000', name: 'player', team: 'CT' }],
  weapons: ['AK-47'],
};

interface FakeWorker extends ParseWorker {
  readonly sent: WorkerIn[];
  terminations: number;
  emit(message: WorkerOut): void;
}

function fakeWorker(): FakeWorker {
  const sent: WorkerIn[] = [];
  const worker: FakeWorker = {
    sent,
    terminations: 0,
    onmessage: null,
    onerror: null,
    postMessage: (message) => sent.push(message),
    terminate: () => {
      worker.terminations += 1;
    },
    emit: (message) => worker.onmessage?.(new MessageEvent('message', { data: message })),
  };

  return worker;
}

const demoFile = () => new File([], 'demo.dem');

describe('runParse', () => {
  it('assembles the header and the columnar halves into one parsed demo', async () => {
    const worker = fakeWorker();
    const track = newTrack();
    const events = newEvents();
    const progress: Array<[ParsePhase, number]> = [];

    const parsing = runParse(worker, demoFile(), {
      onProgress: (phase, percent) => progress.push([phase, percent]),
    });

    expect(worker.sent).toEqual([{ type: 'parse', source: expect.any(File) }]);

    worker.emit({ type: 'progress', phase: 'parse', percent: 33 });
    worker.emit({ type: 'header', header: HEADER });
    worker.emit({ type: 'done', track, events });

    await expect(parsing).resolves.toEqual({ header: HEADER, track, events });
    expect(progress).toEqual([['parse', 33]]);
    expect(worker.terminations).toBe(1);
  });

  it('rejects with the code the worker reported, never with prose', async () => {
    const worker = fakeWorker();
    const parsing = runParse(worker, demoFile());

    worker.emit({ type: 'error', code: 'POV_DEMO_UNSUPPORTED' });

    await expect(parsing).rejects.toThrow(new DemoParseError('POV_DEMO_UNSUPPORTED'));
    expect(worker.terminations).toBe(1);
  });

  it('terminates the worker when the parse is cancelled, rather than letting it finish', async () => {
    const worker = fakeWorker();
    const controller = new AbortController();
    const parsing = runParse(worker, demoFile(), { signal: controller.signal });

    controller.abort();

    await expect(parsing).rejects.toThrow(DOMException);
    expect(worker.terminations).toBe(1);
  });

  it('never starts a parse a cancelled signal has already ruled out', async () => {
    const worker = fakeWorker();
    const parsing = runParse(worker, demoFile(), { signal: AbortSignal.abort() });

    await expect(parsing).rejects.toThrow(DOMException);
    expect(worker.sent).toEqual([]);
    expect(worker.terminations).toBe(1);
  });

  it('stops listening once it has settled, so a late message cannot resolve it twice', async () => {
    const worker = fakeWorker();
    const parsing = runParse(worker, demoFile());

    worker.emit({ type: 'error', code: 'NOT_A_DEMO' });
    await expect(parsing).rejects.toThrow(DemoParseError);

    expect(worker.onmessage).toBeNull();
  });

  it('refuses a result whose header never arrived', async () => {
    const worker = fakeWorker();
    const parsing = runParse(worker, demoFile());

    worker.emit({ type: 'done', track: newTrack(), events: newEvents() });

    await expect(parsing).rejects.toThrow(/header/);
    expect(worker.terminations).toBe(1);
  });
});
