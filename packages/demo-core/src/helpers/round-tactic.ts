import type { Grenade, ParsedDemo, Team } from '../schema';
import { asTick, FLAG_ALIVE } from '../schema';
import { WEAPON_REFERENCES } from './reference-data';
import { type Coordination, windowCoordination } from './round-coordination';
import { type CutInput, type RoundStepKind, type StepCut, stepCuts } from './round-tactic-cuts';
import { clampRoundWindow, defaultRoundWindow, type RoundWindow } from './round-tactic-window';
import { simplifyRoute } from './route-simplify';
import { type OpeningSide, openingSideBySlot } from './score';
import { frameForTick, slotSampleIndex } from './selectors';
import {
  MAX_FLASHES_CARRIED,
  MAX_GRENADES_CARRIED,
  MAX_OF_OTHER_KIND_CARRIED,
} from './tactic-loadout';
import type {
  Tactic,
  TacticEnemy,
  TacticPoint,
  TacticRound,
  TacticStep,
  TacticStepPlayer,
  TacticThrow,
} from './tactics';
import { type TeamBuyClass, teamBuyClass } from './team-stats';
import { utilityKindOfGrenade } from './utility';

/** A route keeps a corner only where the walked path strays further than this from the line. */
export const ROUTE_TOLERANCE_UNITS = 70;
/** A player who stays within this of where a step began is shown standing. */
export const STANDING_UNITS = 60;

export interface RoundTacticOptions {
  /** The window to cut; the default window of the round when absent. Clamped to the round. */
  readonly window?: RoundWindow | undefined;
  readonly id: string;
}

export interface RoundTactic {
  /** Titles and step names are empty: the app names them from `stepKinds`. */
  readonly tactic: Tactic;
  readonly stepKinds: readonly RoundStepKind[];
  /** Seconds from the window start at which each step begins. */
  readonly stepStartSeconds: readonly number[];
  /** Tactic slot to the demo slot it was cut from. */
  readonly demoSlots: readonly number[];
  readonly window: RoundWindow;
  readonly side: Team;
  readonly coordination: Coordination;
  /** The other team over the same window, cut at the same steps; undefined when the round has none. */
  readonly opponents: Tactic | undefined;
  /**
   * For saving, one list per step: every opponent alive when it begins, where each stood, the one
   * killed in it marked dead at the spot of the kill with the tactic slot of its killer.
   */
  readonly enemies: readonly (readonly TacticEnemy[])[];
}

export interface RoundTeam {
  /** Demo slots of the team in that round, ascending. */
  readonly slots: readonly number[];
  readonly side: Team;
}

/** The players of a team (named by opening side) in a round, and the side they held. */
export function roundTeam(
  demo: ParsedDemo,
  roundIndex: number,
  team: OpeningSide,
): RoundTeam | undefined {
  const round = demo.events.rounds[roundIndex];
  if (round === undefined) return undefined;
  const teams = openingSideBySlot(demo);
  const present = round.economy.filter(
    (entry) => entry.team !== null && teams[entry.slot] === team,
  );
  if (present.length === 0) return undefined;
  const ctCount = present.filter((entry) => entry.team === 'CT').length;
  return {
    slots: present.map((entry) => entry.slot).sort((a, b) => a - b),
    side: ctCount * 2 >= present.length ? 'CT' : 'T',
  };
}

/** The tactic round a team's buy stands for, from the team buy the stats already name. */
export function tacticRoundOfBuy(buy: TeamBuyClass | null): TacticRound | undefined {
  return buy === null || buy === 'mixed' ? undefined : buy;
}

/** The gun a player fired most in the round: the knife in hand at freeze end says nothing of the buy. */
function firedWeapon(demo: ParsedDemo, slot: number, roundIndex: number): string | undefined {
  const round = demo.events.rounds[roundIndex];
  if (round === undefined) return undefined;
  const counts = new Map<string, number>();
  for (const shot of demo.events.shots) {
    if (shot.shooter !== slot || shot.tick < round.freezeTimeEndTick || shot.tick > round.endTick) {
      continue;
    }
    const name = demo.header.weapons[shot.weapon];
    if (name === undefined || !WEAPON_REFERENCES.some((weapon) => weapon.name === name)) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best: string | undefined;
  for (const [name, count] of counts) {
    if (count > (counts.get(best ?? '') ?? 0)) best = name;
  }
  return best;
}

function pointAt(demo: ParsedDemo, frame: number, slot: number): TacticPoint {
  const index = slotSampleIndex(demo.track, frame, slot);
  return {
    x: Math.round(demo.track.posX[index] ?? 0),
    y: Math.round(demo.track.posY[index] ?? 0),
    z: Math.round(demo.track.posZ[index] ?? 0),
  };
}

function isAliveAt(demo: ParsedDemo, frame: number, slot: number): boolean {
  return ((demo.track.flags[slotSampleIndex(demo.track, frame, slot)] ?? 0) & FLAG_ALIVE) !== 0;
}

interface StepSpan {
  readonly startTick: number;
  readonly endTick: number;
  readonly isLast: boolean;
}

function isInSpan(tick: number, span: StepSpan): boolean {
  return tick >= span.startTick && (tick < span.endTick || (span.isLast && tick <= span.endTick));
}

function landing(grenade: Grenade): TacticPoint | undefined {
  if (grenade.detonationPosition !== null) {
    return {
      x: Math.round(grenade.detonationPosition.x),
      y: Math.round(grenade.detonationPosition.y),
      z: Math.round(grenade.detonationPosition.z),
    };
  }
  const { trajectory } = grenade;
  const last = trajectory.sampleCount - 1;
  if (last < 0) return undefined;
  return {
    x: Math.round(trajectory.x[last] ?? 0),
    y: Math.round(trajectory.y[last] ?? 0),
    z: Math.round(trajectory.z[last] ?? 0),
  };
}

interface Context {
  readonly demo: ParsedDemo;
  readonly demoSlots: readonly number[];
  readonly input: CutInput;
}

function stepThrows(context: Context, span: StepSpan, stepIndex: number): readonly TacticThrow[] {
  const { demo, demoSlots } = context;
  const throws: TacticThrow[] = [];
  for (const grenade of demo.events.grenades) {
    const slot = demoSlots.indexOf(grenade.thrower);
    if (slot === -1 || !isInSpan(grenade.throwTick, span)) continue;
    const to = landing(grenade);
    if (to === undefined) continue;
    const frame = frameForTick(demo.track, grenade.throwTick);
    throws.push({
      id: `throw-${stepIndex}-${throws.length}`,
      throwerSlot: slot,
      kind: utilityKindOfGrenade(grenade.type),
      from: pointAt(demo, frame, grenade.thrower),
      to,
      releaseTime: 0,
    });
  }
  return throws;
}

function deathTick(demo: ParsedDemo, demoSlot: number, window: RoundWindow): number | undefined {
  const kill = demo.events.kills.find(
    (entry) =>
      entry.victim === demoSlot && entry.tick >= window.startTick && entry.tick <= window.endTick,
  );
  return kill?.tick;
}

interface WalkedRoute {
  readonly points: readonly TacticPoint[];
  /** Real seconds before the player left `STANDING_UNITS` of where the step began. */
  readonly delaySeconds?: number;
  /** Real seconds from leaving until the end of the route. */
  readonly runSeconds?: number;
}

const roundMillis = (seconds: number): number => Math.round(seconds * 1000) / 1000;

function routeOf(
  context: Context,
  slot: number,
  span: StepSpan,
  throws: readonly TacticThrow[],
  diedAt: number | undefined,
): WalkedRoute {
  const { demo, demoSlots } = context;
  const demoSlot = demoSlots[slot] ?? 0;
  const none: WalkedRoute = { points: [] };
  const firstFrame = frameForTick(demo.track, asTick(span.startTick));
  const lastTick = diedAt !== undefined && isInSpan(diedAt, span) ? diedAt : span.endTick;
  const lastFrame = frameForTick(demo.track, asTick(lastTick));
  if (diedAt !== undefined && diedAt < span.startTick) return none;
  if (!isAliveAt(demo, firstFrame, demoSlot) && diedAt === undefined) return none;

  const path: TacticPoint[] = [];
  for (let frame = firstFrame; frame <= lastFrame; frame++)
    path.push(pointAt(demo, frame, demoSlot));

  const anchors = throws
    .filter((thrown) => thrown.throwerSlot === slot)
    .map((thrown) =>
      path.findIndex((point) => point.x === thrown.from.x && point.y === thrown.from.y),
    );
  const kept = simplifyRoute(path, ROUTE_TOLERANCE_UNITS, anchors);
  const points = kept.slice(1).flatMap((index) => path[index] ?? []);
  const start = path[0];
  if (start === undefined) return none;
  const isStanding = points.every(
    (point) => Math.hypot(point.x - start.x, point.y - start.y) <= STANDING_UNITS,
  );
  if (isStanding && diedAt === undefined) return none;

  const left = path.findIndex(
    (point) => Math.hypot(point.x - start.x, point.y - start.y) > STANDING_UNITS,
  );
  if (left === -1) return { points };
  const hz = demo.track.sampleHz;
  return {
    points,
    delaySeconds: roundMillis(left / hz),
    runSeconds: roundMillis((path.length - 1 - left) / hz),
  };
}

function buildStep(
  context: Context,
  span: StepSpan,
  stepIndex: number,
  windowStartTick: number,
): { readonly step: TacticStep; readonly startSeconds: number } {
  const { demo, demoSlots } = context;
  const throws = stepThrows(context, span, stepIndex);
  const startSeconds =
    Math.round(((span.startTick - windowStartTick) / demo.header.tickRate) * 10) / 10;
  const players: TacticStepPlayer[] = demoSlots.map((demoSlot, slot) => {
    const diedAt = deathTick(demo, demoSlot, context.input.window);
    const walked = routeOf(context, slot, span, throws, diedAt);
    return {
      slot,
      route: { mode: 'points', points: walked.points },
      ...(walked.delaySeconds !== undefined && walked.delaySeconds > 0
        ? { delaySeconds: walked.delaySeconds }
        : {}),
      ...(walked.runSeconds !== undefined && walked.runSeconds > 0
        ? { runSeconds: walked.runSeconds }
        : {}),
      label: demo.header.players.find((player) => player.slot === demoSlot)?.name,
    };
  });
  return {
    startSeconds,
    step: {
      id: `step-${stepIndex}`,
      name: '',
      startsAt: startSeconds,
      players,
      throws,
    },
  };
}

/** What a holder already carries, by grenade kind, and in all. */
interface Carried {
  readonly byKind: Map<string, number>;
  total: number;
}

function canCarry(carried: Carried | undefined, kind: string): boolean {
  if (carried === undefined) return true;
  const limit = kind === 'flash' ? MAX_FLASHES_CARRIED : MAX_OF_OTHER_KIND_CARRIED;
  return (carried.byKind.get(kind) ?? 0) < limit && carried.total < MAX_GRENADES_CARRIED;
}

/** Who holds a throw at the buy: its thrower, else the first teammate with room, else the thrower. */
function carrierOf(held: ReadonlyMap<number, Carried>, thrown: TacticThrow, slotCount: number) {
  if (canCarry(held.get(thrown.throwerSlot), thrown.kind)) return thrown.throwerSlot;
  for (let slot = 0; slot < slotCount; slot += 1) {
    if (canCarry(held.get(slot), thrown.kind)) return slot;
  }
  return thrown.throwerSlot;
}

/**
 * A player who throws more than one buy can carry was handed the rest, by a drop or a pickup the
 * demo does not record: the extra throws name the first teammate with room as `droppedBy`, so the
 * tactic's loadout stays buyable. A throw no one has room for keeps its thrower.
 */
function assignCarriers(steps: readonly TacticStep[], slotCount: number): readonly TacticStep[] {
  const held = new Map<number, Carried>();
  return steps.map((step) => ({
    ...step,
    throws: step.throws.map((thrown) => {
      if (thrown.kind === 'kit') return thrown;
      const carrier = carrierOf(held, thrown, slotCount);
      const carried = held.get(carrier) ?? { byKind: new Map<string, number>(), total: 0 };
      carried.byKind.set(thrown.kind, (carried.byKind.get(thrown.kind) ?? 0) + 1);
      carried.total += 1;
      held.set(carrier, carried);
      return carrier === thrown.throwerSlot ? thrown : { ...thrown, droppedBy: carrier };
    }),
  }));
}

function deathsOf(context: Context, cuts: readonly StepCut[]): Readonly<Record<number, number>> {
  const { demo, demoSlots, input } = context;
  const deaths: Record<number, number> = {};
  const startFrame = frameForTick(demo.track, input.window.startTick);
  demoSlots.forEach((demoSlot, slot) => {
    const tick = deathTick(demo, demoSlot, input.window);
    if (tick === undefined) {
      if (!isAliveAt(demo, startFrame, demoSlot)) deaths[slot] = 0;
      return;
    }
    const index = cuts.findLastIndex((cut) => cut.tick <= tick);
    deaths[slot] = Math.max(index, 0) + 1;
  });
  return deaths;
}

function buildSteps(
  context: Context,
  cuts: readonly StepCut[],
): readonly { readonly step: TacticStep; readonly startSeconds: number }[] {
  const { input } = context;
  return cuts.map((cut, index) =>
    buildStep(
      context,
      {
        startTick: cut.tick,
        endTick: cuts[index + 1]?.tick ?? input.window.endTick,
        isLast: index === cuts.length - 1,
      },
      index,
      input.window.startTick,
    ),
  );
}

function killOf(context: Context, demoSlot: number) {
  const { demo, input } = context;
  return demo.events.kills.find(
    (entry) =>
      entry.victim === demoSlot &&
      entry.tick >= input.window.startTick &&
      entry.tick <= input.window.endTick,
  );
}

/** Each step's opponents for saving, from the opponents' deaths (step number of the death, 1-based). */
function enemiesOf(
  context: Context,
  team: Context,
  cuts: readonly StepCut[],
  deaths: Readonly<Record<number, number>>,
): readonly (readonly TacticEnemy[])[] {
  const { demo, demoSlots } = context;
  return cuts.map((cut, stepIndex) => {
    const startFrame = frameForTick(demo.track, asTick(cut.tick));
    const enemies: TacticEnemy[] = [];
    demoSlots.forEach((demoSlot, slot) => {
      const died = deaths[slot];
      if (died !== undefined && died < stepIndex + 1) return;
      const id = `enemy-${slot}`;
      if (died !== stepIndex + 1) {
        enemies.push({ id, at: pointAt(demo, startFrame, demoSlot) });
        return;
      }
      const kill = killOf(context, demoSlot);
      const killer =
        kill === undefined || kill.attacker === null ? -1 : team.demoSlots.indexOf(kill.attacker);
      enemies.push({
        id,
        at: pointAt(demo, frameForTick(demo.track, asTick(kill?.tick ?? cut.tick)), demoSlot),
        isDead: true,
        ...(killer === -1 ? {} : { killedBy: killer }),
      });
    });
    return enemies;
  });
}

/** The tactic with each root-plan step's `enemies` set; a step with none carries no key. */
export function withStepEnemies(
  tactic: Tactic,
  enemies: readonly (readonly TacticEnemy[])[],
): Tactic {
  return {
    ...tactic,
    plans: tactic.plans.map((plan) =>
      plan.parentId !== null
        ? plan
        : {
            ...plan,
            steps: plan.steps.map((step, index) => {
              const { enemies: _previous, ...rest } = step;
              const list = enemies[index] ?? [];
              return list.length === 0 ? rest : { ...rest, enemies: list };
            }),
          },
    ),
  };
}

/** A roster's steps at the given cuts as a tactic; only the asking team buys and trades its grenades. */
function tacticOfRoster(
  context: Context,
  roster: RoundTeam,
  cuts: readonly StepCut[],
  id: string,
  isOwn: boolean,
): { readonly tactic: Tactic; readonly startSeconds: readonly number[] } {
  const { demo, input } = context;
  const { roundIndex, window } = input;
  const built = buildSteps(context, cuts);
  const startFrame = frameForTick(demo.track, window.startTick);
  const weapons: Record<number, string> = {};
  roster.slots.forEach((demoSlot, slot) => {
    const weapon = firedWeapon(demo, demoSlot, roundIndex);
    if (weapon !== undefined) weapons[slot] = weapon;
  });

  const round = demo.events.rounds[roundIndex];
  const buyRound =
    round === undefined || !isOwn ? undefined : tacticRoundOfBuy(teamBuyClass(round, roster.side));
  const steps = built.map((entry) => entry.step);

  const tactic: Tactic = {
    id,
    title: '',
    map: demo.header.map,
    side: roster.side,
    ...(buyRound === undefined ? {} : { rounds: [buyRound] }),
    spawns: roster.slots.map((demoSlot) => pointAt(demo, startFrame, demoSlot)),
    plans: [
      {
        id: 'plan-root',
        condition: '',
        parentId: null,
        forkAfter: 0,
        deaths: deathsOf(context, cuts),
        steps: isOwn ? assignCarriers(steps, roster.slots.length) : steps,
      },
    ],
    ...(Object.keys(weapons).length > 0 ? { weapons } : {}),
    createdAt: 0,
    updatedAt: 0,
  };
  return { tactic, startSeconds: built.map((entry) => entry.startSeconds) };
}

/**
 * One team's round as a tactic: the five players' tracks over a window cut into steps at the
 * team's utility bursts, first contact and the plant, each track simplified into a points route,
 * each grenade a throw from where its thrower stood to where it landed, and a death ending a
 * player's route in the step it happened in. Times are seconds from the window start.
 *
 * The other team is cut the same way at the same steps (`opponents`), so step `k` of both starts
 * at one moment; `enemies` is the same team as marks for saving.
 *
 * Throws carry `releaseTime: 0`: the board times a throw from when its thrower reaches the route
 * point nearest `from`, which is an approximation of when it really left. Every point keeps its
 * altitude `z`, which is how the board knows the floor a player or a grenade is on (Nuke's upper
 * and lower floor, Mirage's underpass); demo-core itself knows no floors.
 */
export function tacticOfRound(
  demo: ParsedDemo,
  roundIndex: number,
  team: OpeningSide,
  options: RoundTacticOptions,
): RoundTactic | undefined {
  const roster = roundTeam(demo, roundIndex, team);
  const requested = options.window ?? defaultRoundWindow(demo, roundIndex);
  const window =
    requested === undefined ? undefined : clampRoundWindow(demo, roundIndex, requested);
  if (roster === undefined || window === undefined) return undefined;

  const input: CutInput = {
    demo,
    roundIndex,
    slots: new Set(roster.slots),
    side: roster.side,
    window,
  };
  const context: Context = { demo, demoSlots: roster.slots, input };
  const cuts = stepCuts(input);
  const own = tacticOfRoster(context, roster, cuts, options.id, true);

  const rival = roundTeam(demo, roundIndex, team === 't' ? 'ct' : 't');
  const rivalContext: Context | undefined =
    rival === undefined
      ? undefined
      : {
          demo,
          demoSlots: rival.slots,
          input: { ...input, slots: new Set(rival.slots), side: rival.side },
        };
  const opponents =
    rival === undefined || rivalContext === undefined
      ? undefined
      : tacticOfRoster(rivalContext, rival, cuts, `${options.id}-opponents`, false).tactic;

  return {
    tactic: own.tactic,
    stepKinds: cuts.map((cut) => cut.kind),
    stepStartSeconds: own.startSeconds,
    demoSlots: roster.slots,
    window,
    side: roster.side,
    coordination: windowCoordination(input),
    opponents,
    enemies:
      rivalContext === undefined
        ? cuts.map(() => [])
        : enemiesOf(rivalContext, context, cuts, deathsOf(rivalContext, cuts)),
  };
}
