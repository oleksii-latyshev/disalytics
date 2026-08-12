import { useCallback, useEffect, useState } from 'react';

export interface Fullscreen {
  isFullscreen: boolean;
  toggle: () => void;
}

/**
 * Full screen for the whole document. The state is read from `fullscreenchange` rather than from
 * what the toggle last did, because `Esc` leaves full screen without asking the page first.
 */
export function useFullscreen(): Fullscreen {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const sync = (): void => setIsFullscreen(document.fullscreenElement !== null);

    sync();
    document.addEventListener('fullscreenchange', sync);

    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = useCallback(() => {
    // A rejected request is the browser declining a gesture it did not consider a gesture, which is
    // not a state the interface can do anything about.
    if (document.fullscreenElement === null) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
      return;
    }

    void document.exitFullscreen().catch(() => undefined);
  }, []);

  return { isFullscreen, toggle };
}
