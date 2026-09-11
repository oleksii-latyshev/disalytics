import { useEffect, useState } from 'react';
import { SKIP_WAITING_MESSAGE } from '../constants/messages';

/**
 * Registers the service worker and, once a new one is waiting behind the one in control, answers
 * with the function that lets it take over. `null` until then — and on a first install, where there
 * is no old shell to leave.
 *
 * Every tab reloads on `controllerchange`, not only the one that pressed: a tab left running the old
 * chunks would ask a precache that no longer holds them, of a server that only has the new ones.
 */
export function useWorkerUpdate(): (() => void) | null {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;

    const container = navigator.serviceWorker;
    const abort = new AbortController();
    const { signal } = abort;
    const wasControlled = container.controller !== null;

    const offer = (worker: ServiceWorker | null) => {
      if (worker && container.controller && !signal.aborted) setWaiting(worker);
    };

    const register = async () => {
      const registration = await container.register('/sw.js');
      offer(registration.waiting);
      registration.addEventListener(
        'updatefound',
        () => {
          const { installing } = registration;
          if (!installing) return;
          installing.addEventListener(
            'statechange',
            () => {
              if (installing.state === 'installed') offer(installing);
            },
            { signal },
          );
        },
        { signal },
      );
    };

    container.addEventListener(
      'controllerchange',
      () => {
        if (wasControlled) window.location.reload();
      },
      { signal },
    );
    void register();

    return () => abort.abort();
  }, []);

  if (!waiting) return null;
  return () => waiting.postMessage(SKIP_WAITING_MESSAGE);
}
