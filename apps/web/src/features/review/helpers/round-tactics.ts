import {
  type BombSite,
  type Coordination,
  matchSegments,
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
  /** The side that won the round, which the pill's underline is drawn in. */
  readonly winner: Team;
  /** Whether a half or an overtime period starts at this round. */
  readonly startsSegment: boolean;
  readonly isPlanted: boolean;
  /** `null` when there was no plant, or the plant's site is not known. */
  readonly site: BombSite | null;
  readonly stepCount: number;
  readonly coordination: Coordination;
}

/** The rounds a team played, each read once over its default window. */
export function roundEntries(demo: ParsedDemo, team: OpeningSide): readonly RoundEntry[] {
  const entries: RoundEntry[] = [];
  const starts = new Set(matchSegments(demo).map((segment) => segment.startIndex));
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
      winner: round.winner,
      startsSegment: roundIndex > 0 && starts.has(roundIndex),
      isPlanted: plant !== undefined,
      site: plant?.site ?? null,
      stepCount: steps,
      coordination: result.coordination,
    });
  });
  return entries;
}

/**
 * Which rounds the strip lights. Every switch but `isPlantedOnly` is a kind of round that is
 * shown, so the default has them all on and turning one off dims what it names.
 */
export interface RoundFilter {
  readonly t: boolean;
  readonly ct: boolean;
  readonly won: boolean;
  readonly lost: boolean;
  /** Only the rounds in which the bomb was planted. */
  readonly isPlantedOnly: boolean;
}

export const ALL_ROUNDS: RoundFilter = {
  t: true,
  ct: true,
  won: true,
  lost: true,
  isPlantedOnly: false,
};

export function isFiltering(filter: RoundFilter): boolean {
  return !filter.t || !filter.ct || !filter.won || !filter.lost || filter.isPlantedOnly;
}

export function matchesFilter(entry: RoundEntry, filter: RoundFilter): boolean {
  if (!(entry.side === 'T' ? filter.t : filter.ct)) return false;
  if (!(entry.didWin ? filter.won : filter.lost)) return false;
  return !filter.isPlantedOnly || entry.isPlanted;
}

/**
 * The round a key press lands on: the next one in that direction that matches the filter, or
 * `undefined` at the end of the strip. Rounds that do not match are walked past.
 */
export function stepRound(
  entries: readonly RoundEntry[],
  filter: RoundFilter,
  from: number,
  direction: 1 | -1,
): RoundEntry | undefined {
  for (let at = from + direction; at >= 0 && at < entries.length; at += direction) {
    const entry = entries[at];
    if (entry !== undefined && matchesFilter(entry, filter)) return entry;
  }
  return undefined;
}

export function edgeRound(
  entries: readonly RoundEntry[],
  filter: RoundFilter,
  end: 'first' | 'last',
): RoundEntry | undefined {
  const matching = entries.filter((entry) => matchesFilter(entry, filter));
  return end === 'first' ? matching.at(0) : matching.at(-1);
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

/** Where an arrow, Home or End press on the strip lands; `null` when the key is not the strip's. */
export function roundForKey(
  entries: readonly RoundEntry[],
  filter: RoundFilter,
  from: number,
  key: string,
): RoundEntry | undefined | null {
  switch (key) {
    case 'ArrowRight':
      return stepRound(entries, filter, from, 1);
    case 'ArrowLeft':
      return stepRound(entries, filter, from, -1);
    case 'Home':
      return edgeRound(entries, filter, 'first');
    case 'End':
      return edgeRound(entries, filter, 'last');
    default:
      return null;
  }
}
