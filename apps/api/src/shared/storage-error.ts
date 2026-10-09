import { Data, Effect } from 'effect';

/** A D1 or KV call failed. Reads and writes surface it; the HTTP layer turns it into a 500. */
export class StorageError extends Data.TaggedError('StorageError')<{ readonly cause: unknown }> {}

export function attempt<A>(run: () => Promise<A>): Effect.Effect<A, StorageError> {
  return Effect.tryPromise({ try: run, catch: (cause) => new StorageError({ cause }) });
}
