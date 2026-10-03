import type { Tactic } from '@disa/demo-core';
import { useCallback, useState } from 'react';
import { pushHistoryState, redoHistoryState, undoHistoryState } from '../helpers/editor-actions';

interface History {
  readonly past: readonly Tactic[];
  readonly future: readonly Tactic[];
}

export function useTacticHistory(tactic: Tactic, setTactic: (tactic: Tactic) => void) {
  const [history, setHistory] = useState<History>({ past: [], future: [] });

  const pushHistory = useCallback((prevTactic: Tactic) => {
    setHistory((curr) => ({
      past: pushHistoryState(curr.past, prevTactic),
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((curr) => {
      const nextState = undoHistoryState(curr.past, curr.future, tactic);
      if (nextState === null) return curr;

      setTactic(nextState.current);
      return { past: nextState.past, future: nextState.future };
    });
  }, [tactic, setTactic]);

  const redo = useCallback(() => {
    setHistory((curr) => {
      const nextState = redoHistoryState(curr.past, curr.future, tactic);
      if (nextState === null) return curr;

      setTactic(nextState.current);
      return { past: nextState.past, future: nextState.future };
    });
  }, [tactic, setTactic]);

  return {
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    pushHistory,
    undo,
    redo,
  };
}
