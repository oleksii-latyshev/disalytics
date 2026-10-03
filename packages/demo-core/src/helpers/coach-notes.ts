import type { PlayerSlot } from '../schema';

export interface CoachNotePoint {
  readonly x: number;
  readonly y: number;
}

export interface CoachNoteStroke {
  readonly id: string;
  readonly color: string;
  readonly points: readonly CoachNotePoint[];
}

export type CoachNoteUtilityKind = 'smoke' | 'molotov' | 'flash' | 'he';

export interface CoachNoteUtility {
  readonly id: string;
  readonly kind: CoachNoteUtilityKind;
  readonly point: CoachNotePoint;
}

export interface CoachNoteMovedPlayer {
  readonly slot: PlayerSlot;
  readonly point: CoachNotePoint;
}

/** Everything a coach drew on the plate, in plate coordinates. */
export interface CoachNoteAnnotations {
  readonly strokes: readonly CoachNoteStroke[];
  readonly utilities: readonly CoachNoteUtility[];
  readonly movedPlayers: readonly CoachNoteMovedPlayer[];
}

/**
 * A drawing kept on its round. `frame` is the sample the plate stood on when it was drawn, which is
 * where a moved player's original position is read from. One note per round.
 */
export interface CoachNote {
  readonly roundIndex: number;
  readonly frame: number;
  readonly annotations: CoachNoteAnnotations;
}

const UTILITY_KINDS: readonly string[] = ['smoke', 'molotov', 'flash', 'he'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIndex(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPoint(value: unknown): value is CoachNotePoint {
  return isObject(value) && Number.isFinite(value.x) && Number.isFinite(value.y);
}

function isStroke(value: unknown): value is CoachNoteStroke {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.color === 'string' &&
    Array.isArray(value.points) &&
    value.points.every(isPoint)
  );
}

function isUtility(value: unknown): value is CoachNoteUtility {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.kind === 'string' &&
    UTILITY_KINDS.includes(value.kind) &&
    isPoint(value.point)
  );
}

function isMovedPlayer(value: unknown): value is CoachNoteMovedPlayer {
  return isObject(value) && isIndex(value.slot) && isPoint(value.point);
}

function isAnnotations(value: unknown): value is CoachNoteAnnotations {
  return (
    isObject(value) &&
    Array.isArray(value.strokes) &&
    value.strokes.every(isStroke) &&
    Array.isArray(value.utilities) &&
    value.utilities.every(isUtility) &&
    Array.isArray(value.movedPlayers) &&
    value.movedPlayers.every(isMovedPlayer)
  );
}

/** What comes back from storage is untrusted: anything that is not a whole note is absent. */
export function isCoachNote(value: unknown): value is CoachNote {
  return (
    isObject(value) &&
    isIndex(value.roundIndex) &&
    isIndex(value.frame) &&
    isAnnotations(value.annotations)
  );
}

export function noteForRound(
  notes: readonly CoachNote[],
  roundIndex: number | undefined,
): CoachNote | null {
  if (roundIndex === undefined) return null;

  return notes.find((note) => note.roundIndex === roundIndex) ?? null;
}

export function notedRounds(notes: readonly CoachNote[]): ReadonlySet<number> {
  return new Set(notes.map((note) => note.roundIndex));
}

/** Saving replaces: a round holds one note. */
export function withNote(notes: readonly CoachNote[], note: CoachNote): readonly CoachNote[] {
  return [...notes.filter((existing) => existing.roundIndex !== note.roundIndex), note];
}

export function withoutNote(notes: readonly CoachNote[], roundIndex: number): readonly CoachNote[] {
  return notes.filter((note) => note.roundIndex !== roundIndex);
}
