/** What the demo's bytes are read into. Narrow enough that this module never sees the WASM glue. */
export interface ByteSink {
  push(chunk: Uint8Array): void;
}

/** Structural rather than `DemoSource` itself, so this module is exercisable without a browser. */
export type FileLike = File | { getFile(): Promise<File> };

export async function fileOf(source: FileLike): Promise<File> {
  return 'getFile' in source ? source.getFile() : source;
}

/**
 * Streams `file` into `sink`. Reading it whole first would hold the demo in the JavaScript heap and
 * in linear memory at once, which is where the §16 peak-memory budget actually goes.
 */
export async function streamInto(file: File, sink: ByteSink): Promise<void> {
  const reader = file.stream().getReader();

  try {
    let chunk = await reader.read();

    while (!chunk.done) {
      sink.push(chunk.value);
      chunk = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }
}
