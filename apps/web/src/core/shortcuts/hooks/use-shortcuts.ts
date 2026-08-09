import { useEffect, useRef } from 'react';

export type ShortcutMap = Readonly<Record<string, () => void>>;

/** Anything that consumes typed characters itself. A range input does not — it reads arrow keys. */
const TEXT_ENTRY = 'textarea, select, [contenteditable="true"], input:not([type="range"])';

/** Keys a control activates itself, which a global binding must not take away from it. */
const ACTIVATION_KEYS = new Set([' ', 'Enter']);

function isHandledByTarget(event: KeyboardEvent): boolean {
  const { target } = event;
  if (!(target instanceof Element)) return false;
  if (target.matches(TEXT_ENTRY)) return true;

  return ACTIVATION_KEYS.has(event.key) && target.matches('button, a[href], [role="button"]');
}

/**
 * Binds `event.key` to an action for as long as the component lives. The map may be rebuilt on
 * every render — the listener reads the latest one rather than being torn down and re-added.
 */
export function useShortcuts(shortcuts: ShortcutMap): void {
  const shortcutsRef = useRef(shortcuts);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isHandledByTarget(event)) return;

      const action = shortcutsRef.current[event.key];
      if (action === undefined) return;

      event.preventDefault();
      action();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
