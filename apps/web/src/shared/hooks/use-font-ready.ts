import { useEffect, useState } from 'react';

/**
 * Whether a CSS font shorthand can be measured for real. A canvas that measures text before its
 * webfont arrives caches the fallback's widths, and `document.fonts` is the only thing that knows
 * the difference — a canvas never triggers the download itself.
 */
export function useFontReady(font: string): boolean {
  const [isReady, setIsReady] = useState(() => document.fonts.check(font));

  useEffect(() => {
    if (isReady) return;

    let isCurrent = true;
    // Either outcome ends the wait: a font that fails to load is the fallback, measured honestly.
    const settle = () => {
      if (isCurrent) setIsReady(true);
    };

    document.fonts.load(font).then(settle, settle);

    return () => {
      isCurrent = false;
    };
  }, [font, isReady]);

  return isReady;
}
