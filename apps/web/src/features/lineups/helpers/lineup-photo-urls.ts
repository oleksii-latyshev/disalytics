import { localImageHash } from '@disa/demo-core';
import { openLineupStore } from '@disa/demo-store';

/** Object URLs are never revoked: one per distinct photo, bounded by the photos on this device. */
const resolved = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

/** The object URL for a `local:` ref once loaded, else undefined. */
export function cachedLocalPhotoUrl(ref: string): string | undefined {
  return resolved.get(ref);
}

export function resolveLocalPhotoUrl(ref: string): Promise<string | null> {
  const hash = localImageHash(ref);
  if (hash === null) return Promise.resolve(null);

  const known = resolved.get(ref);
  if (known !== undefined) return Promise.resolve(known);

  const inFlight = pending.get(ref);
  if (inFlight !== undefined) return inFlight;

  const loading = (async () => {
    try {
      const store = await openLineupStore();
      if (store === null) return null;
      try {
        const blob = await store.getPhoto(hash);
        if (blob === null) return null;
        const url = URL.createObjectURL(blob);
        resolved.set(ref, url);
        return url;
      } finally {
        store.close();
      }
    } catch {
      return null;
    } finally {
      pending.delete(ref);
    }
  })();
  pending.set(ref, loading);
  return loading;
}
