import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { openOpfsBackend } from '../opfs';
import { installNavigator, installOpfsDouble, missing } from './opfs-double';

/** Node defines its own `navigator`, and every test here replaces it. */
const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

let double = installOpfsDouble();

beforeEach(() => {
  double = installOpfsDouble();
});

afterAll(() => {
  if (original === undefined) Reflect.deleteProperty(globalThis, 'navigator');
  else Object.defineProperty(globalThis, 'navigator', original);
});

async function opened() {
  const backend = await openOpfsBackend();

  if (backend === null) throw new Error('the backend refused to open');

  return backend;
}

describe('the OPFS tier', () => {
  it('gives back the bytes it was handed, joined in order, and says which tier it is', async () => {
    const backend = await opened();

    await backend.write('demo', [Uint8Array.from([1, 2, 3]), Uint8Array.from([4, 5])]);

    expect(backend.kind).toBe('opfs');
    expect(await backend.read('demo')).toEqual(Uint8Array.from([1, 2, 3, 4, 5]));
    expect(double.closed).toBe(1);
  });

  it('reads a name it has never written as a miss rather than as a failure', async () => {
    expect(await (await opened()).read('nothing')).toBeNull();
  });

  it('lets a failure that is not a missing file come back out', async () => {
    const backend = await opened();
    const refused = new DOMException('not yours', 'NotAllowedError');

    double.fail.getFileHandle = refused;

    await expect(backend.read('demo')).rejects.toBe(refused);
  });

  it('aborts the stream when a write fails, rather than closing a half-written file', async () => {
    const backend = await opened();
    const broken = new DOMException('the disk is full', 'QuotaExceededError');

    double.fail.write = broken;

    await expect(backend.write('demo', [Uint8Array.from([1])])).rejects.toBe(broken);
    expect(double.aborted).toBe(1);
    expect(double.closed).toBe(0);
    expect(double.files.has('demo')).toBe(false);
  });

  it('removes a name, and removing one that has gone is not an error', async () => {
    const backend = await opened();

    await backend.write('demo', [Uint8Array.from([1])]);
    await backend.remove('demo');
    await backend.remove('demo');

    expect(await backend.read('demo')).toBeNull();
    expect(await backend.list()).toEqual([]);
  });

  it('lets a removal that failed for another reason come back out', async () => {
    const backend = await opened();
    const refused = new DOMException('not yours', 'NotAllowedError');

    double.fail.removeEntry = refused;

    await expect(backend.remove('demo')).rejects.toBe(refused);
  });

  it('lists every name it holds and nothing else', async () => {
    const backend = await opened();

    await backend.write('one', [Uint8Array.from([1])]);
    await backend.write('two', [Uint8Array.from([2])]);

    expect([...(await backend.list())].sort()).toEqual(['one', 'two']);
  });

  it('answers null where there is no navigator at all', async () => {
    installNavigator(undefined);

    expect(await openOpfsBackend()).toBeNull();
  });

  it('answers null where the browser has no OPFS', async () => {
    installNavigator({ storage: {} });

    expect(await openOpfsBackend()).toBeNull();
  });

  // Firefox in private browsing exposes `getDirectory` and throws from it, which is why the call
  // itself is the feature detection rather than the presence of the method.
  it('answers null where getDirectory is there and throws', async () => {
    double.fail.getDirectory = missing();

    expect(await openOpfsBackend()).toBeNull();
  });
});
