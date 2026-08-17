import { useEffect, useRef } from 'react';
import { actionForKey, type ShortcutAction } from '../helpers/bindings';

export type ShortcutActions = Readonly<Partial<Record<ShortcutAction, () => void>>>;

interface Options {
  /**
   * Holds every binding while something else owns the keyboard — a `<dialog>` in the top layer.
   * `Esc` is the reason this exists rather than a filter over the map: closing a modal is a platform
   * close request, and a global handler that calls `preventDefault()` on `Escape` cancels it.
   */
  isSuspended?: boolean;
}

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

/** A press that belongs to the browser or to the focused control rather than to a binding. */
function isSomeoneElses(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return true;

  return isHandledByTarget(event);
}

/**
 * Binds `docs/DESIGN.md` §9.1's keys to the actions the screen supplies, for as long as the component
 * lives. Which key reaches which action is `helpers/bindings`' to say, so the help sheet and the
 * keyboard cannot disagree. The actions may be rebuilt on every render — the listener reads the
 * latest ones rather than being torn down and re-added.
 */
export function useShortcuts(actions: ShortcutActions, options: Options = {}): void {
  const actionsRef = useRef(actions);
  const isSuspendedRef = useRef(options.isSuspended === true);

  useEffect(() => {
    actionsRef.current = actions;
    isSuspendedRef.current = options.isSuspended === true;
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isSuspendedRef.current || isSomeoneElses(event)) return;

      const name = actionForKey(event.key);
      if (name === undefined) return;

      const action = actionsRef.current[name];
      if (action === undefined) return;

      event.preventDefault();
      action();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
