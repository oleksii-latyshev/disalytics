import { describe, expect, it } from 'vitest';
import { fileOf, streamInto } from '../source';

const DEMO_BYTES = Uint8Array.from([0x50, 0x42, 0x44, 0x45, 0x4d, 0x53, 0x32, 0x00]);

function demoFile(): File {
  return new File([DEMO_BYTES], 'demo.dem');
}

describe('fileOf', () => {
  it('takes a File as it is', async () => {
    const file = demoFile();

    expect(await fileOf(file)).toBe(file);
  });

  it('opens a file-system handle, so a file-handler launch needs no copy', async () => {
    const file = demoFile();

    expect(await fileOf({ getFile: async () => file })).toBe(file);
  });
});

describe('streamInto', () => {
  it('delivers every byte in order', async () => {
    const received: number[] = [];
    await streamInto(demoFile(), { push: (chunk) => received.push(...chunk) });

    expect(Uint8Array.from(received)).toEqual(DEMO_BYTES);
  });

  it('delivers nothing for an empty file rather than one empty chunk', async () => {
    let chunks = 0;
    await streamInto(new File([], 'demo.dem'), {
      push: () => {
        chunks += 1;
      },
    });

    expect(chunks).toBe(0);
  });
});
