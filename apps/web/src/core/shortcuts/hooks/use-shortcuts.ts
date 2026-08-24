import { useEffect, useRef } from 'react';
import { actionForKey, type ShortcutAction } from '../helpers/bindings';

/** What fired a binding. A binding with more than one trigger needs to know which one arrived. */
export interface ShortcutPress {
  readonly key: string;
  /**
   * The keyboard's own auto-repeat, which DESIGN.md §9.1 reads as *held* rather than as pressed
   * again — the repeat delay is the reader's own hardware saying a tap has become a hold.
   */
  readonly isRepeat: boolean;
}

export type ShortcutActions = Readonly<
  Partial<Record<ShortcutAction, (press: ShortcutPress) => void>>
>;

interface Options {
  /**
   * Holds every binding while something else owns the keyboard — a `<dialog>` in the top layer.
   * `Esc` is the reason this exists rather than a filter over the map: closing a modal is a platform
   * close request, and a global handler that calls `preventDefault()` on `Escape` cancels it.
   */
  isSuspended?: boolean;
  /**
   * The key that started `action` was let go. It also fires when the window loses the keyboard
   * altogether, because a key released outside the window never reports itself — and §9.1's held
   * arrow would otherwise leave the match running fast for ever.
   */
  onRelease?: (action: ShortcutAction) => void;
}

/** Anything that consumes typed characters itself. A range input does not — it reads arrow keys. */
const TEXT_ENTRY = 'textarea, select, [contenteditable="true"], input:not([type="range"])';

/** Keys a control activates itself, which a global binding must not take away from it. */
const ACTIVATION_KEYS = new Set([' ', 'Enter']);

/** Keys a slider walks its own value with — the round timeline's scrubber is one. */
const SLIDER_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

function isHandledByTarget(event: KeyboardEvent): boolean {
  const { target } = event;
  if (!(target instanceof Element)) return false;
  if (target.matches(TEXT_ENTRY)) return true;
  if (SLIDER_KEYS.has(event.key) && target.matches('input[type="range"]')) return true;

  return ACTIVATION_KEYS.has(event.key) && target.matches('button, a[href], [role="button"]');
}

/** A press that belongs to the browser or to the focused control rather than to a binding. */
function isSomeoneElses(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return true;
  // A roving-focus group walks itself with the arrow keys and says so by calling `preventDefault`
  // on the way up. Without this the same press both moves the focus and seeks the match.
  if (event.defaultPrevented) return true;

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
  const optionsRef = useRef(options);

  useEffect(() => {
    actionsRef.current = actions;
    optionsRef.current = options;
  });

  useEffect(() => {
    // Which actions a key is currently holding down, so a release reaches the action that started
    // and nothing else.
    const held = new Set<ShortcutAction>();

    const release = (action: ShortcutAction): void => {
      if (!held.delete(action)) return;

      optionsRef.current.onRelease?.(action);
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (optionsRef.current.isSuspended === true || isSomeoneElses(event)) return;

      const name = actionForKey(event.key);
      if (name === undefined) return;

      const action = actionsRef.current[name];
      if (action === undefined) return;

      event.preventDefault();
      held.add(name);
      action({ key: event.key, isRepeat: event.repeat });
    };

    // Deliberately not suspended: a sheet raised in the middle of a hold still has to hear the key
    // go up, or the hold outlives the screen that started it.
    const handleKeyUp = (event: KeyboardEvent): void => {
      const name = actionForKey(event.key);
      if (name !== undefined) release(name);
    };

    const releaseAll = (): void => {
      for (const action of [...held]) release(action);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', releaseAll);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', releaseAll);
      releaseAll();
    };
  }, []);
}
