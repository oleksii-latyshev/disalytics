import { useEffect } from 'react';

/**
 * Runs `onEscape` on `Escape` while `isActive`, and keeps the press from going further.
 *
 * It listens on `window` in the capture phase so it runs before any binding further down, and
 * stands down while a sheet or a popover is open, whose own `Escape` is the one that is meant.
 */
export function useEscape(isActive: boolean, onEscape: () => void): void {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('[data-shortcuts-suspended], [data-popup-open]') !== null) return;

      event.preventDefault();
      onEscape();
    };

    window.addEventListener('keydown', handleKeyDown, true);

    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isActive, onEscape]);
}
