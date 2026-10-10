import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { formatRoute, parseRoute, type Route } from '../helpers/route';

const listeners = new Set<() => void>();

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  globalThis.addEventListener('hashchange', notify);
  return () => {
    listeners.delete(notify);
    globalThis.removeEventListener('hashchange', notify);
  };
}

const hashNow = () => globalThis.location.hash;

/**
 * The place the address names, and a way to change it. A push is a history entry (Back returns);
 * a replace rewrites the current one, for a choice that is not a step (a map picked in a list).
 */
export function useRoute(): readonly [Route, (route: Route, mode?: 'push' | 'replace') => void] {
  const hash = useSyncExternalStore(subscribe, hashNow, () => '');
  const route = useMemo(() => parseRoute(hash), [hash]);
  const navigate = useCallback((next: Route, mode: 'push' | 'replace' = 'push') => {
    const target = formatRoute(next);
    if (mode === 'push') {
      globalThis.location.hash = target;
      return;
    }
    globalThis.history.replaceState(null, '', `${globalThis.location.pathname}${target}`);
    for (const notify of listeners) notify();
  }, []);
  return [route, navigate];
}
