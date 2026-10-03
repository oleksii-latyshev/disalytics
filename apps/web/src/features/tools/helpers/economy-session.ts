import {
  countObservedWeapons,
  type EnemyRoundObservation,
  emptyWeaponObservations,
  OBSERVED_WEAPONS,
  type ObservedWeapon,
  type RoundEndReason,
  type Team,
} from '@disa/demo-core';

export type TrackedRound = EnemyRoundObservation & { readonly id: number };
export type SavedSession = { readonly openingSide: Team; readonly rounds: readonly TrackedRound[] };

export const STORAGE_KEY = 'disa.enemyEconomy.v1';
export const EMPTY_SESSION: SavedSession = { openingSide: 'CT', rounds: [] };

const MAX_SAVED_ROUNDS = 256;
const MAX_KNOWN_WEAPONS = 5;
const REASONS: readonly RoundEndReason[] = [
  'elimination',
  'bomb-defused',
  'bomb-exploded',
  'time-expired',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return (
    Number.isInteger(value) && typeof value === 'number' && value >= 0 && value <= MAX_KNOWN_WEAPONS
  );
}

function isReason(value: unknown): value is RoundEndReason {
  return REASONS.some((reason) => reason === value);
}

function isTeam(value: unknown): value is Team {
  return value === 'CT' || value === 'T';
}

function parseWeapons(value: unknown): Record<ObservedWeapon, number> | null {
  if (!isRecord(value)) return null;
  const weapons: Record<ObservedWeapon, number> = { ...emptyWeaponObservations() };
  for (const weapon of OBSERVED_WEAPONS) {
    const count = value[weapon];
    if (!isCount(count)) return null;
    weapons[weapon] = count;
  }
  return countObservedWeapons(weapons) <= MAX_KNOWN_WEAPONS ? weapons : null;
}

function parseRound(value: unknown, id: number): TrackedRound | null {
  if (!isRecord(value)) return null;
  const weapons = parseWeapons(value.weapons);
  if (weapons === null || !isTeam(value.ourSide)) return null;
  if (typeof value.weWon !== 'boolean' || !isReason(value.reason)) return null;
  if (value.enemySurvivors !== null && !isCount(value.enemySurvivors)) return null;
  if (value.enemyKills !== null && !isCount(value.enemyKills)) return null;
  if (value.bombPlanted !== null && typeof value.bombPlanted !== 'boolean') return null;
  return {
    id,
    ourSide: value.ourSide,
    weWon: value.weWon,
    reason: value.reason,
    enemySurvivors: value.enemySurvivors,
    enemyKills: value.enemyKills,
    bombPlanted: value.bombPlanted,
    weapons,
  };
}

export function parseSession(raw: string | null): SavedSession {
  if (raw === null) return EMPTY_SESSION;
  try {
    const saved: unknown = JSON.parse(raw);
    if (!isRecord(saved) || !isTeam(saved.openingSide)) return EMPTY_SESSION;
    if (!Array.isArray(saved.rounds) || saved.rounds.length > MAX_SAVED_ROUNDS) {
      return EMPTY_SESSION;
    }

    const rawRounds: readonly unknown[] = saved.rounds;
    const rounds: TrackedRound[] = [];
    for (const value of rawRounds) {
      const round = parseRound(value, rounds.length + 1);
      if (round === null) return EMPTY_SESSION;
      rounds.push(round);
    }
    return { openingSide: saved.openingSide, rounds };
  } catch {
    return EMPTY_SESSION;
  }
}

export function readSession(): SavedSession {
  try {
    return parseSession(localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_SESSION;
  }
}

export function writeSession(session: SavedSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // The calculator remains usable when browser storage is unavailable.
  }
}
