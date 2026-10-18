import {
  type BombSite,
  type Coordination,
  type OpeningSide,
  type ParsedDemo,
  type RoundWindow,
  roundPlant,
  type Team,
  type TeamBuyClass,
  tacticOfRound,
  teamBuyClass,
} from '@disa/demo-core';

export interface RoundEntry {
  readonly roundIndex: number;
  readonly number: number;
  /** The side the team held that round: sides follow the round, never the roster. */
  readonly side: Team;
  readonly buy: TeamBuyClass | null;
  readonly didWin: boolean;
  readonly isPlanted: boolean;
  /** `null` when there was no plant, or the plant's site is not known. */
  readonly site: BombSite | null;
  readonly stepCount: number;
  readonly coordination: Coordination;
}

export type RoundSideFilter = 'all' | Team;
export type RoundSort = 'round' | 'coordination';

const LEVEL_RANK = { coordinated: 0, partial: 1, loose: 2 } as const;

/** The rounds a team played, each read once over its default window. */
export function roundEntries(demo: ParsedDemo, team: OpeningSide): readonly RoundEntry[] {
  const entries: RoundEntry[] = [];
  demo.events.rounds.forEach((round, roundIndex) => {
    const result = tacticOfRound(demo, roundIndex, team, { id: '' });
    if (result === undefined) return;
    const steps = result.tactic.plans[0]?.steps.length ?? 0;
    const plant = roundPlant(demo, roundIndex);
    entries.push({
      roundIndex,
      number: round.number,
      side: result.side,
      buy: teamBuyClass(round, result.side),
      didWin: round.winner === result.side,
      isPlanted: plant !== undefined,
      site: plant?.site ?? null,
      stepCount: steps,
      coordination: result.coordination,
    });
  });
  return entries;
}

export function visibleEntries(
  entries: readonly RoundEntry[],
  side: RoundSideFilter,
  sort: RoundSort,
): readonly RoundEntry[] {
  const shown = side === 'all' ? entries : entries.filter((entry) => entry.side === side);
  if (sort === 'round') return shown;
  return [...shown].sort(
    (a, b) =>
      LEVEL_RANK[a.coordination.level] - LEVEL_RANK[b.coordination.level] || a.number - b.number,
  );
}

/**
 * The id a round's tactic is stored under: the demo, the round, the team and the window, so saving
 * the same window again replaces the tactic and another window is another tactic.
 */
export function roundTacticId(
  demoKey: string,
  roundIndex: number,
  team: OpeningSide,
  window: RoundWindow,
): string {
  return `round:${demoKey}:${roundIndex + 1}:${team}:${window.startTick}-${window.endTick}`;
}
