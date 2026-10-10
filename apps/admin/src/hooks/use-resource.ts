import { useCallback, useEffect, useRef, useState } from 'react';
import { type Failure, isFailure } from '../api/client';

export type Resource<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: T }
  | { readonly status: 'error'; readonly failure: Failure };

/**
 * Loads something whenever `key` changes (`null` means nothing to load yet) and again on `reload`.
 * A slower answer to an older key never overwrites a newer one.
 */
export function useResource<T>(
  key: string | null,
  load: () => Promise<T>,
): readonly [Resource<T>, () => void] {
  const [state, setState] = useState<Resource<T>>({ status: 'idle' });
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  // `version` is the trigger for a reload; the effect does not read it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: version re-runs the load on demand
  useEffect(() => {
    if (key === null) {
      setState({ status: 'idle' });
      return;
    }
    let current = true;
    setState({ status: 'loading' });
    loadRef
      .current()
      .then((data) => {
        if (current) setState({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (current) {
          setState({
            status: 'error',
            failure: isFailure(error) ? error : { key: 'admin.error.network', detail: undefined },
          });
        }
      });
    return () => {
      current = false;
    };
  }, [key, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return [state, reload];
}

/** The same resource with its data read through `pick`, for a screen that shows one part of it. */
export function mapResource<T, U>(resource: Resource<T>, pick: (data: T) => U): Resource<U> {
  return resource.status === 'ready' ? { status: 'ready', data: pick(resource.data) } : resource;
}
