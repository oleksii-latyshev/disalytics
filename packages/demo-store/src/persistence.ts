/**
 * `best-effort` is the common answer rather than the exceptional one: Chrome grants persistence on
 * engagement or installation and declines otherwise, so the UI has to be able to say that the cache
 * exists and may still be cleared.
 */
export type PersistenceStatus = 'persisted' | 'best-effort' | 'unsupported';

export async function requestPersistence(): Promise<PersistenceStatus> {
  if (typeof navigator === 'undefined') return 'unsupported';
  if (typeof navigator.storage?.persist !== 'function') return 'unsupported';

  if (await navigator.storage.persisted()) return 'persisted';

  return (await navigator.storage.persist()) ? 'persisted' : 'best-effort';
}
