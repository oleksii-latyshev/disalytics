import { type KeyboardEvent, useCallback, useRef, useState } from 'react';

const STEPS: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1 };

export interface RovingFocus {
  /** The item that holds the group's single tab stop. */
  tabStop: number;
  /** Ref callback for the item at `index`, so the group can move focus itself. */
  register: (index: number) => (node: HTMLButtonElement | null) => void;
  /** Arrow keys walk the group; `Home` and `End` jump to its ends. */
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, index: number) => void;
  /** Moves the tab stop without moving focus — what a pointer press leaves behind. */
  select: (index: number) => void;
}

/**
 * One tab stop for a group of many, walked with the arrow keys. A match holds a couple of hundred
 * kills and thirty rounds, and tabbing through either of them to reach the control after it is not
 * an interface.
 *
 * `count` is read on every call rather than captured, so a shorter match than the last one cannot
 * leave the tab stop on an item that no longer exists and drop the whole group out of the tab order.
 */
export function useRovingFocus(count: number): RovingFocus {
  const itemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const focusAt = useCallback(
    (index: number) => {
      const wanted = Math.min(Math.max(index, 0), count - 1);

      setActiveIndex(wanted);
      itemsRef.current[wanted]?.focus();
    },
    [count],
  );

  const register = useCallback(
    (index: number) => (node: HTMLButtonElement | null) => {
      itemsRef.current[index] = node;
    },
    [],
  );

  // The index comes from the item the key arrived on rather than from state, so two keys inside one
  // React batch both step from where the focus actually is.
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const step = STEPS[event.key];

      if (step === undefined) {
        if (event.key !== 'Home' && event.key !== 'End') return;

        event.preventDefault();
        focusAt(event.key === 'Home' ? 0 : count - 1);
        return;
      }

      event.preventDefault();
      focusAt(index + step);
    },
    [count, focusAt],
  );

  return {
    tabStop: Math.min(activeIndex, Math.max(count - 1, 0)),
    register,
    onKeyDown,
    select: setActiveIndex,
  };
}
