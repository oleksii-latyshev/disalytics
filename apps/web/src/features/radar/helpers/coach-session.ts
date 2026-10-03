import type { CoachNote } from '@disa/demo-core';
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
  /** The saved note on the round the plate is paused in; `null` while playing or when there is none. */
  readonly note: CoachNote | null;
  /** The frame a loaded note was drawn at. `null` for a fresh drawing, which follows the plate. */
  readonly frame: number | null;
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
  readonly setNote: (note: CoachNote | null) => void;
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
  note: null,
  frame: null,
};

function hasDrawings({ past, present, future }: CoachHistory): boolean {
  return past.length > 0 || future.length > 0 || present !== EMPTY_COACH_ANNOTATIONS;
}

export interface CoachDisplay {
  readonly annotations: CoachAnnotations;
  /** The frame the annotations' moved players are measured from; `null` follows the plate. */
  readonly frame: number | null;
}

/** What the plate draws: the session's drawing, or the saved note while there is no drawing. */
export function coachDisplay({ history, note, frame }: CoachSessionState): CoachDisplay {
  if (!hasDrawings(history) && note !== null) {
    return { annotations: note.annotations, frame: note.frame };
  }

  return { annotations: history.present, frame };
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

  /** Brings the shown note into the session, so that the next change edits it. */
  const adoptNote = (): void => {
    const { note, history } = state;
    if (note === null || hasDrawings(history)) return;
    update({ ...state, history: createCoachHistory(note.annotations), frame: note.frame });
  };

  const endGesture = (): void => {
    if (active === null) return;
    const { base } = active;
    active = null;
    updateHistory(commitCoachGesture(state.history, base));
  };

  const setTool = (tool: CoachTool | null): void => {
    endGesture();
    if (tool !== null) adoptNote();
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
      if (hasDrawings(state.history) || state.frame !== null) {
        update({ ...state, history: createCoachHistory(), frame: null });
      }
    },
    reset: () => {
      active = null;
      if (state.tool === null && !hasDrawings(state.history)) return;
      update({ ...state, tool: null, history: createCoachHistory(), frame: null });
    },
    setNote: (note) => update(note === state.note ? state : { ...state, note }),
    pointerDown: (point, { originals, strokeColor }) => {
      if (state.tool === null) return;
      adoptNote();
      const { tool, history } = state;

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
