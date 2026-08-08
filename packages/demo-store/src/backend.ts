/** Which tier answered. `AGENTS.md` §6.4 puts OPFS first and IndexedDB behind it. */
export type BackendKind = 'opfs' | 'indexeddb';

/**
 * Named blobs of bytes and nothing else. The container format, the cache key and the eviction
 * policy all live above this line, so a tier never has to understand a demo to store one.
 */
export interface StoreBackend {
  readonly kind: BackendKind;
  read(name: string): Promise<Uint8Array<ArrayBuffer> | null>;
  write(name: string, chunks: readonly Uint8Array<ArrayBuffer>[]): Promise<void>;
  remove(name: string): Promise<void>;
  list(): Promise<readonly string[]>;
}
