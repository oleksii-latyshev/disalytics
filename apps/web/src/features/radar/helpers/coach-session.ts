import type { RadarPoint } from '@disa/map-data';
import {
  advanceGesture,
  beginGesture,
  type CoachGesture,
  type OriginalPlayerPoints,
} from './coach-edit';
import {
  type CoachAnnotations,
  type CoachHistory,
  type CoachPencilColor,
  type CoachTool,
  commitCoachGesture,
  createCoachHistory,
  EMPTY_COACH_ANNOTATIONS,
  pushCoachSnapshot,
  redoCoachHistory,
  replaceCoachPresent,
  undoCoachHistory,
} from './coach-types';

export interface CoachSessionState {
  readonly tool: CoachTool | null;
  readonly color: CoachPencilColor;
  readonly history: CoachHistory;
}

export interface CoachTarget {
  readonly originals: OriginalPlayerPoints;
  readonly strokeColor: string;
}

export interface CoachSession {
  readonly getState: () => CoachSessionState;
  readonly subscribe: (listener: () => void) => () => void;
  readonly setTool: (tool: CoachTool | null) => void;
  readonly toggleTool: (tool: CoachTool) => void;
  readonly setColor: (color: CoachPencilColor) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly clear: () => void;
  readonly discardDrawings: () => void;
  readonly reset: () => void;
  readonly pointerDown: (point: RadarPoint, target: CoachTarget) => void;
  readonly pointerMove: (point: RadarPoint, target: CoachTarget) => void;
  readonly pointerUp: () => void;
}

interface ActiveGesture {
  readonly gesture: CoachGesture;
  readonly base: CoachAnnotations;
}

const INITIAL_STATE: CoachSessionState = {
  tool: null,
  color: 'objective',
  history: createCoachHistory(),
};

function hasDrawings({ past, present, future }: CoachHistory): boolean {
  return past.length > 0 || future.length > 0 || present !== EMPTY_COACH_ANNOTATIONS;
}

export function createCoachSession(): CoachSession {
  let state = INITIAL_STATE;
  let active: ActiveGesture | null = null;
  const listeners = new Set<() => void>();

  const update = (next: CoachSessionState): void => {
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener();
  };

  const updateHistory = (history: CoachHistory): void => update({ ...state, history });

  const endGesture = (): void => {
    if (active === null) return;
    const { base } = active;
    active = null;
    updateHistory(commitCoachGesture(state.history, base));
  };

  const setTool = (tool: CoachTool | null): void => {
    endGesture();
    if (tool !== state.tool) update({ ...state, tool });
  };

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    setTool,
    toggleTool: (tool) => setTool(state.tool === tool ? null : tool),
    setColor: (color) => {
      if (color !== state.color) update({ ...state, color });
    },
    undo: () => updateHistory(undoCoachHistory(state.history) ?? state.history),
    redo: () => updateHistory(redoCoachHistory(state.history) ?? state.history),
    clear: () => {
      if (state.history.present === EMPTY_COACH_ANNOTATIONS) return;
      updateHistory(pushCoachSnapshot(state.history, EMPTY_COACH_ANNOTATIONS));
    },
    discardDrawings: () => {
      active = null;
      if (hasDrawings(state.history)) updateHistory(createCoachHistory());
    },
    reset: () => {
      active = null;
      if (state.tool === null && !hasDrawings(state.history)) return;
      update({ ...state, tool: null, history: createCoachHistory() });
    },
    pointerDown: (point, { originals, strokeColor }) => {
      const { tool, history } = state;
      if (tool === null) return;

      const start = beginGesture(tool, history.present, originals, point, strokeColor);
      if (start === null) return;

      active = { gesture: start.gesture, base: history.present };
      updateHistory(replaceCoachPresent(history, start.annotations));
    },
    pointerMove: (point, { originals }) => {
      if (active === null) return;

      const next = advanceGesture(state.history.present, active.gesture, originals, point);
      if (next !== state.history.present) updateHistory(replaceCoachPresent(state.history, next));
    },
    pointerUp: endGesture,
  };
}
