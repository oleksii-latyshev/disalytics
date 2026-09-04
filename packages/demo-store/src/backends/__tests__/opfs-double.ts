/**
 * A stand-in for the origin private file system, because there is no other kind to have: Node has
 * no OPFS, so the only real one is inside a browser, and putting the suite in one is a cost every
 * commit pays (#75). What the tests on top of this assert is the backend's *own* behaviour — a
 * `NotFoundError` answering `null` on a read and swallowed on a remove, any other failure coming
 * back out, and a write that fails aborting its stream — none of which a real OPFS would decide.
 *
 * The double is deliberately narrow: it implements the five calls `backends/opfs.ts` makes, and the
 * casts are what the rest of `FileSystemDirectoryHandle` would cost to satisfy for no reading.
 */
export interface OpfsDouble {
  /** What the directory holds, so a test can seed one or read one back. */
  readonly files: Map<string, Uint8Array<ArrayBuffer>>;
  /** Thrown by the named call the next time it runs, then cleared. */
  fail: { getFileHandle?: unknown; removeEntry?: unknown; getDirectory?: unknown; write?: unknown };
  aborted: number;
  closed: number;
}

export function missing(): DOMException {
  return new DOMException('no such entry', 'NotFoundError');
}

function joined(chunks: readonly Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const bytes = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return bytes;
}

function raise(double: OpfsDouble, call: keyof OpfsDouble['fail']): void {
  const thrown = double.fail[call];

  if (thrown === undefined) return;

  double.fail[call] = undefined;
  throw thrown;
}

function newFileHandle(double: OpfsDouble, name: string) {
  const chunks: Uint8Array<ArrayBuffer>[] = [];

  return {
    getFile: () => Promise.resolve(new Blob([double.files.get(name) ?? new Uint8Array()])),
    createWritable: () =>
      Promise.resolve({
        write: (chunk: Uint8Array<ArrayBuffer>) => {
          raise(double, 'write');
          chunks.push(chunk);

          return Promise.resolve();
        },
        abort: () => {
          double.aborted += 1;

          return Promise.resolve();
        },
        close: () => {
          double.closed += 1;
          double.files.set(name, joined(chunks));

          return Promise.resolve();
        },
      }),
  };
}

/**
 * Installs the double as `globalThis.navigator` and gives back the state the tests read. Node
 * defines `navigator` itself, so it is replaced through `defineProperty` rather than assigned.
 */
export function installOpfsDouble(files: Map<string, Uint8Array<ArrayBuffer>> = new Map()) {
  const double: OpfsDouble = { files, fail: {}, aborted: 0, closed: 0 };

  const directory = {
    getFileHandle: (name: string, options?: { create?: boolean }) => {
      raise(double, 'getFileHandle');

      if (options?.create !== true && !files.has(name)) return Promise.reject(missing());

      return Promise.resolve(newFileHandle(double, name));
    },
    removeEntry: (name: string) => {
      raise(double, 'removeEntry');

      if (!files.delete(name)) return Promise.reject(missing());

      return Promise.resolve();
    },
    keys: async function* keys() {
      yield* [...files.keys()];
    },
  };

  const root = { getDirectoryHandle: () => Promise.resolve(directory) };

  installNavigator({
    storage: {
      getDirectory: () => {
        raise(double, 'getDirectory');

        return Promise.resolve(root);
      },
    },
  });

  return double;
}

/** `undefined` removes the global outright, which is the "this is not a browser" arm. */
export function installNavigator(value: unknown): void {
  if (value === undefined) {
    Reflect.deleteProperty(globalThis, 'navigator');

    return;
  }

  Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });
}
