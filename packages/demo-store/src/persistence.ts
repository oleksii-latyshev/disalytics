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

/**
 * What the browser says the whole origin is holding — `docs/DESIGN.md` §10.2. It is a different
 * figure from the one the catalog knows: it covers every byte this site has stored rather than the
 * demos alone, and browsers pad it deliberately, so the interface quotes it as an estimate and
 * never as the cache's limit.
 *
 * `null` when the API is missing or answers without numbers, which is a fact worth not stating
 * rather than a zero worth showing.
 */
export interface StorageReport {
  usage: number;
  quota: number;
}

export async function storageEstimate(): Promise<StorageReport | null> {
  if (typeof navigator === 'undefined') return null;
  if (typeof navigator.storage?.estimate !== 'function') return null;

  try {
    const { usage, quota } = await navigator.storage.estimate();

    return usage === undefined || quota === undefined ? null : { usage, quota };
  } catch {
    return null;
  }
}
