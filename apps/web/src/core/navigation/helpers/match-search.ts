export type MatchView = 'stage' | 'scoreboard' | 'duels' | 'heatmap' | 'utility' | 'metrics';
export type AppPath = '/' | '/open' | '/library' | '/tools' | '/lineups' | '/tactics' | '/stats';
export type MatchSearch = { round: number; view: MatchView };

export interface RoundSyncState {
  urlRound: number;
  pendingUrlWrites: readonly number[];
  pendingSeekRound: number | null;
}

export function receiveUrlRound(
  state: RoundSyncState,
  urlRound: number,
  transportRound: number,
): { state: RoundSyncState; seekRound: number | null } {
  if (state.pendingUrlWrites.includes(urlRound)) {
    return {
      state: {
        ...state,
        pendingUrlWrites: state.pendingUrlWrites.filter((round) => round !== urlRound),
      },
      seekRound: null,
    };
  }

  if (urlRound === state.urlRound) return { state, seekRound: null };

  return {
    state: {
      urlRound,
      pendingUrlWrites: [],
      pendingSeekRound: transportRound === urlRound ? null : urlRound,
    },
    seekRound: transportRound === urlRound ? null : urlRound,
  };
}

export function receiveTransportRound(
  state: RoundSyncState,
  transportRound: number,
): { state: RoundSyncState; writeRound: number | null } {
  if (state.pendingSeekRound !== null) {
    return {
      state: {
        ...state,
        pendingSeekRound: transportRound === state.pendingSeekRound ? null : state.pendingSeekRound,
      },
      writeRound: null,
    };
  }

  if (transportRound === state.urlRound) return { state, writeRound: null };
  return {
    state: {
      urlRound: transportRound,
      pendingUrlWrites: [...state.pendingUrlWrites, transportRound],
      pendingSeekRound: null,
    },
    writeRound: transportRound,
  };
}

function isMatchView(value: unknown): value is MatchView {
  return (
    value === 'stage' ||
    value === 'scoreboard' ||
    value === 'duels' ||
    value === 'heatmap' ||
    value === 'utility' ||
    value === 'metrics'
  );
}

export function validateMatchSearch(search: Record<string, unknown>): MatchSearch {
  const roundValue = search.round;
  const round =
    typeof roundValue === 'number' && Number.isSafeInteger(roundValue) && roundValue > 0
      ? roundValue
      : 1;
  const viewValue = search.view;
  const view = isMatchView(viewValue) ? viewValue : 'stage';

  return { round, view };
}

export function clampMatchRound(round: number, roundCount: number): number {
  if (roundCount < 1) return 1;
  return Math.min(Math.max(Math.trunc(round), 1), roundCount);
}
