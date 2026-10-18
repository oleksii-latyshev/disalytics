import {
  type CarryWarning,
  deadAt,
  effectiveSteps,
  GRENADE_KINDS,
  type GrenadeCounts,
  type Lineup,
  planById,
  planSubtree,
  rootPlan,
  type Tactic,
  type TacticEnemy,
  type TacticPlan,
  type TacticStep,
  type TacticThrow,
  tacticLoadout,
  UTILITY_NAMES,
} from '@disa/demo-core';
import type { Translate } from '@disa/i18n';
import { getMapOverview, mapFloors } from '@disa/map-data';
import { enemiesOf } from '../helpers/tactic-enemies';
import { floorName } from '../helpers/tactic-floor-name';
import { calledOnRounds, nameOrFallback } from '../helpers/tactic-names';
import { deadSlotNumbers, planTitle } from '../helpers/tactic-plan-labels';
import {
  formatRoundClock,
  type ScheduledThrow,
  type StepSchedule,
  type TacticSchedule,
} from '../helpers/tactic-schedule';
import { type CropRegion, throwRegion } from './regions';

export interface PdfThrowEntry {
  readonly id: string;
  readonly slot: number;
  readonly kindName: string;
  readonly meta: string;
  readonly droppedBy: string | null;
  readonly notes: string | null;
  /** Where on the plate the throw happens, for the picture beside it; null when it was never scheduled. */
  readonly region: CropRegion | null;
}

export interface PdfPlayerEntry {
  readonly slot: number;
  readonly name: string;
  readonly label: string | null;
  readonly task: string | null;
  readonly delay: string | null;
  readonly isOut: boolean;
}

export interface PdfEnemyEntry {
  readonly title: string;
  readonly role: string | null;
  readonly note: string | null;
  readonly takenBy: string | null;
  readonly deadNote: string | null;
}

/** A floor other than the first that a step's routes or grenades use, and what to call it. */
export interface PdfStepFloor {
  readonly floor: number;
  readonly label: string;
}

export interface PdfBranchBanner {
  readonly eyebrow: string;
  readonly title: string;
  readonly out: string | null;
}

export interface PdfStepSection {
  /** Names this step's pictures; unique across the document. */
  readonly key: string;
  readonly planId: string;
  /** Index among the plan's effective steps. */
  readonly stepIndex: number;
  readonly banner: PdfBranchBanner | null;
  readonly eyebrow: string;
  readonly title: string;
  /** Null when the step was never scheduled, which is when its map is unknown. */
  readonly startsAt: string | null;
  readonly idea: string | null;
  readonly players: readonly PdfPlayerEntry[];
  /** Floors after the first that the step uses, each of which gets a picture of its own. */
  readonly floors: readonly PdfStepFloor[];
  readonly throwsTitle: string;
  readonly throws: readonly PdfThrowEntry[];
  readonly enemies: readonly PdfEnemyEntry[];
}

export interface PdfLoadoutRow {
  readonly slot: number;
  readonly name: string;
  readonly weapon: string;
  readonly grenades: string | null;
  readonly drops: readonly string[];
  readonly cost: string | null;
}

export interface PdfPlanStep {
  readonly number: number;
  readonly name: string;
  readonly clock: string | null;
}

export interface PdfPlanOverview {
  readonly title: string;
  readonly meta: string;
  readonly isRoot: boolean;
  readonly steps: readonly PdfPlanStep[];
}

export interface PdfFact {
  readonly label: string;
  readonly value: string;
}

export interface PdfCover {
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  readonly facts: readonly PdfFact[];
  readonly description: { readonly label: string; readonly text: string } | null;
  readonly loadoutTitle: string;
  readonly loadout: readonly PdfLoadoutRow[];
  readonly teamCost: { readonly label: string; readonly value: string } | null;
  readonly warnings: readonly string[];
  readonly plansTitle: string;
  readonly plans: readonly PdfPlanOverview[];
}

export interface PdfContent {
  readonly title: string;
  readonly cover: PdfCover;
  readonly sections: readonly PdfStepSection[];
  readonly headings: {
    readonly idea: string;
    readonly tasks: string;
    readonly enemies: string;
    readonly out: string;
    readonly noTask: string;
  };
  readonly page: (page: number, total: number) => string;
  readonly continued: (title: string) => string;
}

export interface PdfContentInput {
  readonly tactic: Tactic;
  readonly t: Translate;
  readonly lineups: readonly Pick<Lineup, 'id' | 'title'>[];
  /** The schedule of every plan, by plan id. */
  readonly schedules: ReadonlyMap<string, TacticSchedule>;
}

const BLANK = '';

function filled(text: string | undefined): string | null {
  const trimmed = text?.trim() ?? BLANK;
  return trimmed === BLANK ? null : trimmed;
}

/** The plan the root first, then each branch below it depth first, the order a reader follows. */
export function planOrder(tactic: Tactic): readonly TacticPlan[] {
  const root = rootPlan(tactic);
  return root === undefined ? [] : planSubtree(tactic, root.id);
}

function firstOwnIndex(plan: TacticPlan): number {
  return plan.parentId === null ? 0 : plan.forkAfter + 1;
}

function planName(t: Translate, plan: TacticPlan): string {
  return planTitle(plan, {
    root: t('library.tactics.board.branch.root'),
    branch: t('library.tactics.board.branch.unnamed'),
  });
}

function stepName(t: Translate, step: TacticStep, index: number): string {
  return nameOrFallback(step.name, t('library.tactics.board.strip.unnamed', { index: index + 1 }));
}

function grenadeSummary(counts: GrenadeCounts): string | null {
  const parts = GRENADE_KINDS.filter((kind) => counts[kind] > 0).map(
    (kind) => `${UTILITY_NAMES[kind]} ×${counts[kind]}`,
  );
  return parts.length === 0 ? null : parts.join(' · ');
}

function warningText(t: Translate, warning: CarryWarning): string {
  const slot = warning.slot + 1;
  switch (warning.code) {
    case 'flashLimit':
      return t('library.tactics.loadout.warn.flashLimit', { slot, count: warning.count });
    case 'kindLimit':
      return t('library.tactics.loadout.warn.kindLimit', {
        slot,
        count: warning.count,
        kind: UTILITY_NAMES[warning.kind],
      });
    case 'totalLimit':
      return t('library.tactics.loadout.warn.totalLimit', { slot, count: warning.count });
  }
}

function loadoutOf(tactic: Tactic, t: Translate) {
  const loadout = tacticLoadout(tactic);
  const rows = loadout.players.map(
    (player): PdfLoadoutRow => ({
      slot: player.slot,
      name: t('library.tactics.board.player.title', { slot: player.slot + 1 }),
      weapon: player.weapon ?? t('library.tactics.board.player.weaponAny'),
      grenades: grenadeSummary(player.counts),
      drops: player.drops.map((drop) =>
        t('library.tactics.pdf.buysFor', { kind: UTILITY_NAMES[drop.kind], slot: drop.toSlot + 1 }),
      ),
      cost: player.cost > 0 ? t('library.tactics.loadout.cost', { amount: player.cost }) : null,
    }),
  );
  const teamCost =
    loadout.teamCost > 0
      ? {
          label: t('library.tactics.pdf.teamCost'),
          value: t('library.tactics.loadout.cost', { amount: loadout.teamCost }),
        }
      : null;
  return { rows, teamCost, warnings: loadout.warnings.map((entry) => warningText(t, entry)) };
}

function clockOf(step: StepSchedule | undefined): string | null {
  return step === undefined ? null : formatRoundClock(step.startSeconds);
}

function planOverview(input: PdfContentInput, plan: TacticPlan): PdfPlanOverview {
  const { tactic, t, schedules } = input;
  const schedule = schedules.get(plan.id);
  const effective = effectiveSteps(tactic, plan.id);
  const first = firstOwnIndex(plan);
  const out = deadSlotNumbers(plan);
  let meta: string;
  if (plan.parentId === null) {
    meta = t('library.tactics.board.strip.laneSteps', { count: plan.steps.length });
  } else if (out.length === 0) {
    meta = t('library.tactics.board.strip.laneFrom', { index: first });
  } else {
    meta = t('library.tactics.board.strip.laneFromOut', { index: first, slots: out.join(', ') });
  }
  return {
    title: planName(t, plan),
    meta,
    isRoot: plan.parentId === null,
    steps: effective.slice(first).map((step, offset) => ({
      number: first + offset + 1,
      name: stepName(t, step, first + offset),
      clock: clockOf(schedule?.steps[first + offset]),
    })),
  };
}

function coverOf(input: PdfContentInput, title: string): PdfCover {
  const { tactic, t } = input;
  const rounds = calledOnRounds(tactic.rounds);
  const subtitle =
    rounds === undefined
      ? t('library.tactics.editor.subtitleAny', { map: tactic.map, side: tactic.side })
      : t('library.tactics.editor.subtitle', { map: tactic.map, side: tactic.side, rounds });
  const author = filled(tactic.author);
  const description = filled(tactic.description);
  const { rows, teamCost, warnings } = loadoutOf(tactic, t);
  const stepTotal = tactic.plans.reduce((sum, plan) => sum + plan.steps.length, 0);
  const facts: PdfFact[] = [];
  if (author !== null) facts.push({ label: t('library.tactics.pdf.author'), value: author });
  facts.push({
    label: t('library.tactics.pdf.plans'),
    value: t('library.tactics.transfer.scopeOneMeta', {
      plans: tactic.plans.length,
      steps: stepTotal,
    }),
  });
  return {
    eyebrow: t('library.tactics.pdf.kind'),
    title,
    subtitle,
    facts,
    description:
      description === null
        ? null
        : { label: t('library.tactics.editor.description'), text: description },
    loadoutTitle: t('library.tactics.pdf.loadout'),
    loadout: rows,
    teamCost,
    warnings,
    plansTitle: t('library.tactics.pdf.plans'),
    plans: planOrder(tactic).map((plan) => planOverview(input, plan)),
  };
}

function regionOf(scheduled: ScheduledThrow | undefined): CropRegion | null {
  if (scheduled === undefined) return null;
  return throwRegion(
    { x: scheduled.fromX, y: scheduled.fromY },
    { x: scheduled.toX, y: scheduled.toY },
  );
}

function throwEntry(
  input: PdfContentInput,
  thrown: TacticThrow,
  schedule: StepSchedule | undefined,
): PdfThrowEntry {
  const { t, lineups } = input;
  const scheduled = schedule?.throws.find((entry) => entry.id === thrown.id);
  const slot = thrown.throwerSlot + 1;
  const how =
    thrown.lineupId === undefined
      ? t('library.tactics.board.throws.byHand')
      : (lineups.find((entry) => entry.id === thrown.lineupId)?.title ??
        t('library.tactics.board.throws.fromLineup'));
  const meta =
    scheduled === undefined
      ? `${t('library.tactics.board.player.title', { slot })} · ${how}`
      : t('library.tactics.board.throws.meta', {
          slot,
          how,
          clock: formatRoundClock(scheduled.landAt),
        });
  return {
    id: thrown.id,
    slot: thrown.throwerSlot,
    kindName: UTILITY_NAMES[thrown.kind],
    meta,
    droppedBy:
      thrown.droppedBy === undefined
        ? null
        : t('library.tactics.pdf.droppedBy', { slot: thrown.droppedBy + 1 }),
    notes: filled(thrown.notes),
    region: regionOf(scheduled),
  };
}

function enemyEntry(t: Translate, enemy: TacticEnemy, index: number): PdfEnemyEntry | null {
  if (
    enemy.role === undefined &&
    filled(enemy.note) === null &&
    enemy.killedBy === undefined &&
    enemy.isDead !== true
  ) {
    return null;
  }
  return {
    title: t('library.tactics.board.enemy.pick', { number: index + 1 }),
    role: enemy.role === undefined ? null : t(`library.tactics.board.enemy.roles.${enemy.role}`),
    note: filled(enemy.note),
    takenBy:
      enemy.killedBy === undefined
        ? null
        : t('library.tactics.pdf.enemyTakenBy', { slot: enemy.killedBy + 1 }),
    deadNote: enemy.isDead === true ? t('library.tactics.pdf.enemyDead') : null,
  };
}

interface SectionContext {
  readonly input: PdfContentInput;
  readonly plan: TacticPlan;
  readonly steps: readonly TacticStep[];
  readonly dead: Readonly<Record<number, number>>;
  readonly schedule: TacticSchedule | undefined;
}

/** The players of a step, or none at all when it says nothing of any of them. */
function playersOf(context: SectionContext, step: TacticStep, index: number): PdfPlayerEntry[] {
  const { t } = context.input;
  const slotCount = context.input.tactic.spawns.length;
  const first = firstOwnIndex(context.plan);
  const entries: PdfPlayerEntry[] = [];
  for (let slot = 0; slot < slotCount; slot++) {
    const diesAt = context.dead[slot];
    const isOut = diesAt !== undefined && index >= diesAt;
    const isNews =
      diesAt !== undefined && (diesAt === index || (index === first && diesAt < index));
    if (isOut && !isNews) continue;
    const entry = step.players.find((player) => player.slot === slot);
    const delay = entry?.delaySeconds ?? 0;
    entries.push({
      slot,
      name: t('library.tactics.board.player.title', { slot: slot + 1 }),
      label: filled(entry?.label),
      task: isOut ? null : filled(entry?.task),
      delay: isOut || delay <= 0 ? null : t('library.tactics.pdf.leaves', { seconds: delay }),
      isOut,
    });
  }
  const hasWords = entries.some(
    (entry) => entry.isOut || entry.task !== null || entry.label !== null || entry.delay !== null,
  );
  return hasWords ? entries : [];
}

function bannerOf(input: PdfContentInput, plan: TacticPlan): PdfBranchBanner {
  const { t } = input;
  const out = deadSlotNumbers(plan);
  return {
    eyebrow: t('library.tactics.board.branch.eyebrow', { index: plan.forkAfter + 1 }),
    title: planName(t, plan),
    out:
      out.length === 0
        ? null
        : t('library.tactics.pdf.branchOut', { count: out.length, slots: out.join(', ') }),
  };
}

/** The floors after the first that a step's walked routes and grenades touch, lowest first. */
function stepFloors(input: PdfContentInput, stepSchedule: StepSchedule | undefined) {
  const overview = getMapOverview(input.tactic.map);
  if (overview === undefined || stepSchedule === undefined) return [];
  const used = new Set<number>();
  for (const leg of stepSchedule.legs) for (const floor of leg.floors) used.add(floor);
  for (const thrown of stepSchedule.throws) {
    used.add(thrown.floor);
    used.add(thrown.fromFloor);
  }

  const floors = mapFloors(overview);
  return [...used]
    .filter((floor) => floor > 0 && floors[floor] !== undefined)
    .sort((a, b) => a - b)
    .map((floor) => ({ floor, label: floorName(input.t, floors[floor]?.id ?? 'main') }));
}

function sectionOf(context: SectionContext, index: number): PdfStepSection | null {
  const { input, plan, steps, schedule } = context;
  const { t } = input;
  const step = steps[index];
  if (step === undefined) return null;
  const stepSchedule = schedule?.steps[index];
  const eyebrow = t('library.tactics.board.step.eyebrow', {
    index: index + 1,
    total: steps.length,
  });
  const throws = step.throws.map((thrown) => throwEntry(input, thrown, stepSchedule));
  return {
    key: `${plan.id}:${index}`,
    planId: plan.id,
    stepIndex: index,
    banner: plan.parentId !== null && index === firstOwnIndex(plan) ? bannerOf(input, plan) : null,
    eyebrow: plan.parentId === null ? eyebrow : `${planName(t, plan)} · ${eyebrow}`,
    title: stepName(t, step, index),
    startsAt:
      stepSchedule === undefined
        ? null
        : t('library.tactics.pdf.startsAt', { clock: formatRoundClock(stepSchedule.startSeconds) }),
    idea: filled(step.idea),
    players: playersOf(context, step, index),
    floors: stepFloors(input, stepSchedule),
    throwsTitle: t('library.tactics.board.throws.title', { count: throws.length }),
    throws,
    enemies: enemiesOf(step).flatMap((enemy, at) => enemyEntry(t, enemy, at) ?? []),
  };
}

function sectionsOf(input: PdfContentInput): readonly PdfStepSection[] {
  const sections: PdfStepSection[] = [];
  for (const plan of planOrder(input.tactic)) {
    if (planById(input.tactic, plan.id) === undefined) continue;
    const context: SectionContext = {
      input,
      plan,
      steps: effectiveSteps(input.tactic, plan.id),
      dead: deadAt(input.tactic, plan.id),
      schedule: input.schedules.get(plan.id),
    };
    for (let index = firstOwnIndex(plan); index < context.steps.length; index++) {
      const section = sectionOf(context, index);
      if (section !== null) sections.push(section);
    }
  }
  return sections;
}

/**
 * Everything the PDF says, as finished text in the reader's language: the cover, then a section per
 * step of the main plan followed by those of each branch (only the steps after its fork). No
 * layout, no drawing — that is `layout.ts`'s job.
 */
export function buildPdfContent(input: PdfContentInput): PdfContent {
  const { tactic, t } = input;
  const title = nameOrFallback(tactic.title, t('library.tactics.untitled'));
  return {
    title,
    cover: coverOf(input, title),
    sections: sectionsOf(input),
    headings: {
      idea: t('library.tactics.board.step.idea'),
      tasks: t('library.tactics.pdf.tasks'),
      enemies: t('library.tactics.board.enemy.section'),
      out: t('library.tactics.pdf.out'),
      noTask: t('library.tactics.pdf.noTask'),
    },
    page: (page, total) => t('library.tactics.pdf.page', { page, total }),
    continued: (heading) => t('library.tactics.pdf.continued', { title: heading }),
  };
}
