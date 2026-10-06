import {
  rootPlan,
  type Tactic,
  type TacticDrawingStroke,
  type TacticPlan,
  type TacticPoint,
  type TacticStep,
  type TacticStepPlayer,
  type TacticThrow,
} from '@disa/demo-core';

/**
 * What the board edits today: the main plan as a flat list of steps, each holding where every
 * player stands. A step's position is where its route ends. The board is rebuilt around routes in
 * #590; until then this view keeps it working on the v2 model without losing what it cannot show.
 */

export interface EditorPlayer {
  readonly slot: number;
  readonly x: number;
  readonly y: number;
  readonly yaw?: number | undefined;
  readonly label?: string | undefined;
}

export interface EditorStep {
  readonly id: string;
  readonly name: string;
  readonly timeOffsetSeconds: number;
  readonly players: readonly EditorPlayer[];
  readonly throws: readonly TacticThrow[];
  readonly drawings?: readonly TacticDrawingStroke[] | undefined;
  readonly notes?: string | undefined;
}

export type EditorTactic = Omit<Tactic, 'plans'> & { readonly steps: readonly EditorStep[] };

/** Seconds a step lasts when it is not pinned and the board needs a number. */
const UNPINNED_GAP_SECONDS = 5;

function endOf(player: TacticStepPlayer | undefined): TacticPoint | undefined {
  return player?.route.points[player.route.points.length - 1];
}

function slotsOf(tactic: Tactic, steps: readonly TacticStep[]): readonly number[] {
  const slots = new Set<number>(tactic.spawns.map((_, slot) => slot));
  for (const step of steps) for (const player of step.players) slots.add(player.slot);
  return [...slots].sort((a, b) => a - b);
}

function mainStepsOf(tactic: Tactic): readonly TacticStep[] {
  return rootPlan(tactic)?.steps ?? [];
}

export function toEditorTactic(tactic: Tactic): EditorTactic {
  const { plans: _plans, ...rest } = tactic;
  const source = mainStepsOf(tactic);
  const slots = slotsOf(tactic, source);
  const standing = new Map<number, TacticPoint>();
  let previousOffset = 0;

  const steps = source.map((step, index): EditorStep => {
    const offset = step.startsAt ?? (index === 0 ? 0 : previousOffset + UNPINNED_GAP_SECONDS);
    previousOffset = offset;
    const players = slots.map((slot): EditorPlayer => {
      const entry = step.players.find((player) => player.slot === slot);
      const at = endOf(entry) ?? standing.get(slot) ?? tactic.spawns[slot] ?? { x: 0, y: 0 };
      standing.set(slot, at);
      return { slot, x: at.x, y: at.y, yaw: entry?.yaw, label: entry?.label };
    });
    return {
      id: step.id,
      name: step.name,
      timeOffsetSeconds: offset,
      players,
      throws: step.throws,
      drawings: step.drawings,
      notes: step.idea,
    };
  });
  return { ...rest, steps };
}

function clampForks(plans: readonly TacticPlan[]): readonly TacticPlan[] {
  const lengths = new Map<string, number>();
  const result = new Map<string, TacticPlan>();
  const visit = (plan: TacticPlan): void => {
    const parentLength = plan.parentId === null ? 0 : (lengths.get(plan.parentId) ?? 0);
    const fork =
      plan.parentId === null
        ? plan.forkAfter
        : Math.min(plan.forkAfter, Math.max(0, parentLength - 1));
    const next = fork === plan.forkAfter ? plan : { ...plan, forkAfter: fork };
    result.set(plan.id, next);
    lengths.set(plan.id, plan.parentId === null ? plan.steps.length : fork + 1 + plan.steps.length);
    for (const child of plans.filter((entry) => entry.parentId === plan.id)) visit(child);
  };
  for (const plan of plans.filter((entry) => entry.parentId === null)) visit(plan);
  return plans.map((plan) => result.get(plan.id) ?? plan);
}

/**
 * Writes an edited flat view back into the tactic's main plan. A player whose position did not move
 * keeps the route they had; one that moved gets a one-point route (none when they stayed where the
 * previous step left them). Fields the board does not show — enemies, tasks, delays — carry over.
 */
export function fromEditorTactic(original: Tactic, edited: EditorTactic): Tactic {
  const before = toEditorTactic(original);
  const oldById = new Map(mainStepsOf(original).map((step) => [step.id, step]));
  const oldEditorById = new Map(before.steps.map((step) => [step.id, step]));
  const standing = new Map<number, TacticPoint>();
  for (const [slot, at] of edited.spawns.entries()) standing.set(slot, at);

  const steps = edited.steps.map((step, index): TacticStep => {
    const existing = oldById.get(step.id);
    const oldEditor = oldEditorById.get(step.id);
    const players = step.players.map((player): TacticStepPlayer => {
      const old = existing?.players.find((entry) => entry.slot === player.slot);
      const oldPosition = oldEditor?.players.find((entry) => entry.slot === player.slot);
      const stayed =
        oldPosition !== undefined && oldPosition.x === player.x && oldPosition.y === player.y;
      const from = standing.get(player.slot);
      const at = { x: player.x, y: player.y };
      standing.set(player.slot, at);
      const route =
        old !== undefined && stayed
          ? old.route
          : {
              mode: 'points' as const,
              points: from !== undefined && from.x === at.x && from.y === at.y ? [] : [at],
            };
      return { ...old, slot: player.slot, route, yaw: player.yaw, label: player.label };
    });

    const keepsNull =
      existing?.startsAt === null && step.timeOffsetSeconds === oldEditor?.timeOffsetSeconds;
    const startsAt =
      keepsNull || (index === 0 && step.timeOffsetSeconds === 0) ? null : step.timeOffsetSeconds;
    return {
      ...existing,
      id: step.id,
      name: step.name,
      idea: step.notes,
      startsAt,
      players,
      throws: step.throws,
      drawings: step.drawings,
    };
  });

  const { steps: _steps, ...rest } = edited;
  const plans = original.plans.map((plan) => (plan.parentId === null ? { ...plan, steps } : plan));
  return { ...original, ...rest, plans: clampForks(plans) };
}

/** Runs an edit on the flat view of the main plan and writes the result back. */
export function withEditorTactic(
  tactic: Tactic,
  edit: (editor: EditorTactic) => EditorTactic,
): Tactic {
  return fromEditorTactic(tactic, edit(toEditorTactic(tactic)));
}
