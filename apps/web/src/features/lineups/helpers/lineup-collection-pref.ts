const PREFIX = 'disa.lineups.collection.';

type Prefs = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultPrefs(): Prefs | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/** The collection last open on this map, or null. It is a preference; the collection itself lives in IndexedDB. */
export function readCollectionPreference(
  map: string,
  prefs: Prefs | null = defaultPrefs(),
): string | null {
  try {
    const value = prefs?.getItem(`${PREFIX}${map}`) ?? null;
    return value === null || value === '' ? null : value;
  } catch {
    return null;
  }
}

export function writeCollectionPreference(
  map: string,
  id: string | null,
  prefs: Prefs | null = defaultPrefs(),
): void {
  try {
    if (id === null) prefs?.removeItem(`${PREFIX}${map}`);
    else prefs?.setItem(`${PREFIX}${map}`, id);
  } catch {}
}
