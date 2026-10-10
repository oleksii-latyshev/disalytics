import { describe, expect, it } from 'vitest';
import { createBranch } from '../helpers/tactic-branches';
import { addStepAfter } from '../helpers/tactic-edits';
import { placeMenu } from '../helpers/tactic-menu';
import {
  edgePath,
  graphSize,
  moveInGraph,
  nodeOrigin,
  planGraph,
} from '../helpers/tactic-plan-graph';
import { createNewTactic } from '../helpers/tactic-setup';
import { clampZoom, fitZoom, stepZoom, wheelZoom } from '../helpers/tactic-tree-zoom';

function tree() {
  let tactic = createNewTactic('de_mirage', 'T');
  const rootId = tactic.plans[0]?.id ?? '';
  tactic = addStepAfter(addStepAfter(tactic, rootId, 0, 5), rootId, 1, 5);
  const custom = createBranch(
    tactic,
    { planId: rootId, stepIndex: 0, deadSlot: null, condition: 'mid' },
    5,
  );
  if (custom === null) throw new Error('branch');
  const death = createBranch(
    custom.tactic,
    { planId: rootId, stepIndex: 1, deadSlot: 3, condition: 'dies' },
    5,
  );
  if (death === null) throw new Error('branch');
  const nested = createBranch(
    death.tactic,
    { planId: custom.planId, stepIndex: 1, deadSlot: null, condition: 'nested' },
    5,
  );
  if (nested === null) throw new Error('branch');
  return {
    tactic: nested.tactic,
    rootId,
    customId: custom.planId,
    deathId: death.planId,
    nestedId: nested.planId,
  };
}

describe('planGraph', () => {
  it('puts a branch under its parent, one column right of the step it leaves', () => {
    const { tactic, rootId, customId, deathId, nestedId } = tree();
    const graph = planGraph(tactic, rootId);
    const rows = Object.fromEntries(graph.lanes.map((lane) => [lane.planId, lane.row]));
    expect(rows[rootId]).toBe(0);
    expect(rows[customId]).toBeLessThan(rows[nestedId] ?? -1);
    expect(rows[nestedId]).toBeLessThan(rows[deathId] ?? -1);
    const first = graph.nodes.find((n) => n.planId === customId);
    expect(first?.col).toBe(1);
    expect(graph.rowCount).toBe(4);
  });

  it('draws only own steps, marks the path and greys the dead', () => {
    const { tactic, rootId, deathId } = tree();
    const graph = planGraph(tactic, deathId);
    expect(graph.nodes.filter((n) => n.planId === rootId)).toHaveLength(3);
    expect(graph.nodes.find((n) => n.planId === rootId && n.index === 2)?.isOnPath).toBe(false);
    const dead = graph.nodes.find((n) => n.planId === deathId);
    expect(dead?.alive[3]).toBe(false);
    expect(dead?.alive[0]).toBe(true);
    expect(graph.edges.filter((e) => e.kind === 'fork')).toHaveLength(3);
  });

  it('forks from the plan that stores the step', () => {
    const { tactic, rootId, nestedId } = tree();
    const graph = planGraph(tactic, nestedId);
    const fork = graph.edges.find((e) => e.kind === 'fork' && e.to.planId === nestedId);
    expect(fork?.from.planId).not.toBe(rootId);
  });
});

describe('moveInGraph', () => {
  it('walks a plan and goes back to the fork step from a first card', () => {
    const { tactic, rootId, customId } = tree();
    const graph = planGraph(tactic, rootId);
    expect(moveInGraph(graph, { planId: rootId, index: 0 }, 'right')).toEqual(
      expect.objectContaining({ planId: rootId, index: 1 }),
    );
    expect(moveInGraph(graph, { planId: rootId, index: 2 }, 'right')).toBeNull();
    expect(moveInGraph(graph, { planId: customId, index: 1 }, 'left')).toEqual({
      planId: rootId,
      index: 0,
    });
    expect(moveInGraph(graph, { planId: rootId, index: 0 }, 'left')).toBeNull();
  });

  it('moves between rows to the nearest column', () => {
    const { tactic, rootId, customId } = tree();
    const graph = planGraph(tactic, rootId);
    const down = moveInGraph(graph, { planId: rootId, index: 2 }, 'down');
    expect(down?.planId).toBe(customId);
    expect(moveInGraph(graph, { planId: rootId, index: 2 }, 'up')).toBeNull();
  });
});

describe('layout maths', () => {
  const metrics = {
    nodeWidth: 100,
    nodeHeight: 50,
    colGap: 20,
    rowGap: 10,
    labelWidth: 80,
    padding: 5,
  };

  it('places cards on the grid and sizes the canvas', () => {
    expect(nodeOrigin(metrics, 0, 0)).toEqual({ x: 85, y: 5 });
    expect(nodeOrigin(metrics, 2, 1)).toEqual({ x: 205, y: 125 });
    const { tactic, rootId } = tree();
    const size = graphSize(metrics, planGraph(tactic, rootId));
    expect(size.height).toBe(5 + 3 * 60 + 50 + 10 + 5);
  });

  it('draws a straight line on one row and a curve between rows', () => {
    expect(edgePath(metrics, { x: 0, y: 0 }, { x: 150, y: 0 })).toBe('M100 25 L150 25');
    expect(edgePath(metrics, { x: 0, y: 0 }, { x: 150, y: 60 })).toBe(
      'M100 25 C125 25 125 85 150 85',
    );
  });
});

describe('menu and zoom', () => {
  it('flips a menu that would leave its box', () => {
    const box = { width: 400, height: 200 };
    const menu = { width: 100, height: 80 };
    expect(placeMenu({ x: 10, y: 10 }, box, menu)).toEqual({ left: 10, top: 10 });
    expect(placeMenu({ x: 350, y: 180 }, box, menu)).toEqual({ left: 250, top: 100 });
    expect(placeMenu({ x: 50, y: 190 }, { width: 400, height: 60 }, menu)).toEqual({
      left: 50,
      top: 110,
    });
  });

  it('keeps zoom in range and fits a wide graph', () => {
    expect(clampZoom(9)).toBe(2);
    expect(clampZoom(0.01)).toBe(0.3);
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(0.3, -1)).toBe(0.3);
    expect(wheelZoom(1, -100)).toBe(1.1);
    expect(fitZoom(900, 1800)).toBe(0.5);
    expect(fitZoom(900, 300)).toBe(1);
    expect(fitZoom(0, 300)).toBe(1);
  });
});
