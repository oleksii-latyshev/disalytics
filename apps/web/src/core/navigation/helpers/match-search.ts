export type MatchView = 'stage' | 'stats' | 'duels' | 'heatmap' | 'utility';
export type StatsTab = 'players' | 'rounds';

export const STATS_TABS: readonly StatsTab[] = ['players', 'rounds'];
export type AppPath = '/' | '/open' | '/library' | '/tools' | '/lineups' | '/tactics' | '/stats';
/** `tab` is only carried by the Stats view; every other view leaves it out. */
export type MatchSearch = { round: number; view: MatchView; tab?: StatsTab };

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
    value === 'stats' ||
    value === 'duels' ||
    value === 'heatmap' ||
    value === 'utility'
  );
}

export function isStatsTab(value: unknown): value is StatsTab {
  return value === 'players' || value === 'rounds';
}

/**
 * `scoreboard` and `metrics` were views of their own before they became tabs of Stats, so a link
 * saved from either still lands where it did.
 */
function statsTabOfLegacyView(value: unknown): StatsTab | undefined {
  if (value === 'scoreboard') return 'players';
  if (value === 'metrics') return 'rounds';
  return undefined;
}

export function validateMatchSearch(search: Record<string, unknown>): MatchSearch {
  const roundValue = search.round;
  const round =
    typeof roundValue === 'number' && Number.isSafeInteger(roundValue) && roundValue > 0
      ? roundValue
      : 1;
  const viewValue = search.view;
  const legacyTab = statsTabOfLegacyView(viewValue);

  if (legacyTab !== undefined) return { round, view: 'stats', tab: legacyTab };
  if (viewValue === 'stats') {
    return { round, view: 'stats', tab: isStatsTab(search.tab) ? search.tab : 'players' };
  }

  return { round, view: isMatchView(viewValue) ? viewValue : 'stage' };
}

export function clampMatchRound(round: number, roundCount: number): number {
  if (roundCount < 1) return 1;
  return Math.min(Math.max(Math.trunc(round), 1), roundCount);
}
