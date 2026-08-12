import { useCallback, useState } from 'react';

/**
 * A boolean the reader has chosen, remembered across sessions. `localStorage` is the right home for
 * it — `AGENTS.md` §2 rule 5 bars parsed data from there and allows interface preferences.
 *
 * A browser that refuses storage — private mode, a blocked origin — keeps the flag for this session
 * and forgets it afterwards, which is a better answer than a screen that will not render.
 */
export function useStoredFlag(key: string, fallback: boolean): [boolean, () => void] {
  const [isOn, setIsOn] = useState(() => {
    try {
      const stored = localStorage.getItem(key);

      return stored === null ? fallback : stored === 'true';
    } catch {
      return fallback;
    }
  });

  const toggle = useCallback(() => {
    setIsOn((current) => {
      const next = !current;

      try {
        localStorage.setItem(key, String(next));
      } catch {
        // The preference still holds for this session; only outliving it needs storage.
      }

      return next;
    });
  }, [key]);

  return [isOn, toggle];
}
