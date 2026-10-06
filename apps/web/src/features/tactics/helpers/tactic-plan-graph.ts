import {
  childPlans,
  deadAt,
  effectiveSteps,
  ownerOf,
  planById,
  rootPlan,
  type Tactic,
  type TacticPlan,
  type TacticStep,
} from '@disa/demo-core';

/**
 * The plans of a tactic laid out on a grid: one row per plan (root first, each branch under the
 * plan it leaves), one column per effective step. A plan draws only its own steps, so a branch's
 * first card sits one column right of the step it leaves after.
 */

export interface GraphNodeKey {
  /** The plan that stores the step. */
  readonly planId: string;
  /** Effective index of the step, the same in every plan that shares it. */
  readonly index: number;
}

export interface GraphNode extends GraphNodeKey {
  readonly key: string;
  readonly row: number;
  readonly col: number;
  readonly step: TacticStep;
  /** Slots still alive at this step in the plan that stores it. */
  readonly alive: readonly boolean[];
  /** The step is part of the plan being viewed. */
  readonly isOnPath: boolean;
}

export interface GraphLane {
  readonly planId: string;
  readonly plan: TacticPlan;
  readonly row: number;
  /** Effective index of the lane's first own step. */
  readonly firstIndex: number;
  /** Effective step count, own and shared. */
  readonly length: number;
  readonly isRoot: boolean;
  readonly isCurrent: boolean;
  readonly isOnPath: boolean;
}

export interface GraphEdge {
  readonly kind: 'chain' | 'fork';
  readonly planId: string;
  readonly from: GraphNodeKey;
  readonly to: GraphNodeKey;
  readonly isOnPath: boolean;
}

export interface PlanGraph {
  readonly lanes: readonly GraphLane[];
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly rowCount: number;
  /** Columns up to and including the "add a step" slot of the longest lane. */
  readonly colCount: number;
}

export function nodeKey(planId: string, index: number): string {
  return `${planId}:${index}`;
}

function planOrder(tactic: Tactic): readonly TacticPlan[] {
  const root = rootPlan(tactic);
  if (root === undefined) return [];
  const walk = (plan: TacticPlan): readonly TacticPlan[] => [
    plan,
    ...[...childPlans(tactic, plan.id)]
      .sort((a, b) => a.forkAfter - b.forkAfter)
      .flatMap((child) => walk(child)),
  ];
  return walk(root);
}

/** Each plan on the way from the root to `planId`, with the step it was left after (unbounded for the last). */
function pathLimits(tactic: Tactic, planId: string): ReadonlyMap<string, number> {
  const limits = new Map<string, number>();
  let limit = Number.POSITIVE_INFINITY;
  for (let plan = planById(tactic, planId); plan !== undefined; ) {
    limits.set(plan.id, limit);
    limit = plan.forkAfter;
    plan = plan.parentId === null ? undefined : planById(tactic, plan.parentId);
  }
  return limits;
}

export function planGraph(tactic: Tactic, currentPlanId: string): PlanGraph {
  const order = planOrder(tactic);
  const limits = pathLimits(tactic, currentPlanId);
  const rowOf = new Map(order.map((plan, row) => [plan.id, row]));
  const slotCount = tactic.spawns.length;

  const lanes: GraphLane[] = [];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let colCount = 0;

  for (const plan of order) {
    const row = rowOf.get(plan.id) ?? 0;
    const firstIndex = plan.parentId === null ? 0 : plan.forkAfter + 1;
    const length = effectiveSteps(tactic, plan.id).length;
    const limit = limits.get(plan.id);
    lanes.push({
      planId: plan.id,
      plan,
      row,
      firstIndex,
      length,
      isRoot: plan.parentId === null,
      isCurrent: plan.id === currentPlanId,
      isOnPath: limit !== undefined,
    });
    colCount = Math.max(colCount, length + 1);

    const dead = deadAt(tactic, plan.id);
    plan.steps.forEach((step, offset) => {
      const index = firstIndex + offset;
      nodes.push({
        key: nodeKey(plan.id, index),
        planId: plan.id,
        index,
        row,
        col: index,
        step,
        alive: Array.from({ length: slotCount }, (_, slot) => {
          const diesAt = dead[slot];
          return diesAt === undefined || index < diesAt;
        }),
        isOnPath: limit !== undefined && index <= limit,
      });
      if (offset > 0) {
        edges.push({
          kind: 'chain',
          planId: plan.id,
          from: { planId: plan.id, index: index - 1 },
          to: { planId: plan.id, index },
          isOnPath: limit !== undefined && index <= limit,
        });
      }
    });

    const source = plan.parentId === null ? null : ownerOf(tactic, plan.parentId, plan.forkAfter);
    if (source !== null && plan.steps.length > 0) {
      edges.push({
        kind: 'fork',
        planId: plan.id,
        from: { planId: source.planId, index: plan.forkAfter },
        to: { planId: plan.id, index: firstIndex },
        isOnPath: limit !== undefined,
      });
    }
  }

  return { lanes, nodes, edges, rowCount: order.length, colCount };
}

export type GraphDirection = 'left' | 'right' | 'up' | 'down';

function nearestInRow(graph: PlanGraph, row: number, col: number): GraphNode | null {
  let best: GraphNode | null = null;
  for (const node of graph.nodes) {
    if (node.row !== row) continue;
    if (best === null || Math.abs(node.col - col) < Math.abs(best.col - col)) best = node;
  }
  return best;
}

/**
 * The card an arrow key goes to. Left and right walk a plan's own cards, and left from a branch's
 * first card goes back to the step it leaves; up and down go to the nearest card in the row above
 * or below. Null when there is nowhere to go.
 */
export function moveInGraph(
  graph: PlanGraph,
  from: GraphNodeKey,
  direction: GraphDirection,
): GraphNodeKey | null {
  const current = graph.nodes.find(
    (node) => node.planId === from.planId && node.index === from.index,
  );
  if (current === undefined) return null;

  if (direction === 'up' || direction === 'down') {
    return nearestInRow(graph, current.row + (direction === 'up' ? -1 : 1), current.col);
  }
  if (direction === 'right') {
    return graph.nodes.find((n) => n.planId === from.planId && n.index === from.index + 1) ?? null;
  }
  const previous = graph.nodes.find((n) => n.planId === from.planId && n.index === from.index - 1);
  if (previous !== undefined) return previous;
  const fork = graph.edges.find(
    (edge) =>
      edge.kind === 'fork' && edge.to.planId === from.planId && edge.to.index === from.index,
  );
  return fork === undefined ? null : fork.from;
}

export interface GraphMetrics {
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly colGap: number;
  readonly rowGap: number;
  /** Width of the column of plan names to the left of the cards. */
  readonly labelWidth: number;
  readonly padding: number;
}

export interface GraphPoint {
  readonly x: number;
  readonly y: number;
}

export function nodeOrigin(metrics: GraphMetrics, row: number, col: number): GraphPoint {
  return {
    x: metrics.padding + metrics.labelWidth + col * (metrics.nodeWidth + metrics.colGap),
    y: metrics.padding + row * (metrics.nodeHeight + metrics.rowGap),
  };
}

/** The canvas size; the strip keeps a column for each lane's add-a-step button, the tree does not. */
export function graphSize(metrics: GraphMetrics, graph: PlanGraph, hasAddColumn = true) {
  const last = nodeOrigin(metrics, graph.rowCount - 1, graph.colCount - (hasAddColumn ? 0 : 1));
  return {
    width: last.x + metrics.padding,
    height: last.y + metrics.nodeHeight + metrics.rowGap + metrics.padding,
  };
}

/** A cubic curve from the right edge of one card to the left edge of the next, or a straight line on one row. */
export function edgePath(metrics: GraphMetrics, from: GraphPoint, to: GraphPoint): string {
  const x1 = from.x + metrics.nodeWidth;
  const y1 = from.y + metrics.nodeHeight / 2;
  const y2 = to.y + metrics.nodeHeight / 2;
  if (y1 === y2) return `M${x1} ${y1} L${to.x} ${y2}`;
  const reach = (to.x - x1) / 2;
  return `M${x1} ${y1} C${x1 + reach} ${y1} ${to.x - reach} ${y2} ${to.x} ${y2}`;
}
