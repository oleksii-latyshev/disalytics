import { asPlayerSlot } from '@disa/demo-core';
import type { MapOverview, RadarPoint } from '@disa/map-data';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  drawCoachMovedPlayer,
  drawCoachStroke,
  drawCoachUtility,
  findHitPlayerToken,
  findHitStroke,
  findHitUtility,
  pointDistance,
  pointToSegmentDistance,
  projectPoint,
} from '../helpers/coach-draw';
import {
  createCoachHistory,
  EMPTY_COACH_ANNOTATIONS,
  pushCoachSnapshot,
  redoCoachHistory,
  undoCoachHistory,
} from '../helpers/coach-types';
import { resolvePencilColor } from '../hooks/use-coach-mode';
import { stubPath2D } from './canvas-globals';

stubPath2D();

const OVERVIEW: MapOverview = {
  id: 'de_mirage',
  posX: -3230,
  posY: 1713,
  scale: 5,
  rotate: 0,
  zoom: 1,
  levels: [
    {
      image: 'de_mirage',
      altitudeMax: 10000,
      altitudeMin: -10000,
    },
  ],
};

const GEOMETRY = {
  scale: 1,
  offsetX: 100,
  offsetY: 50,
  tokenRadius: 8,
};

const COLORS = {
  team: { CT: '#4fc3f7', T: '#f59e0b' },
  dead: '#64748b',
  selectionRing: '#ffffff',
  selectionEdge: '#000000',
  label: { halo: '#000', ink: '#fff', damage: '#f00', leader: '#aaa' },
  hollow: '#000',
  gunfire: '#fff',
  countdown: '#fff',
  damage: '#ef4444',
  blind: '#facc15',
  objective: '#eab308',
  nadeHe: '#ef4444',
  nadeSmoke: '#94a3b8',
  nadeMolotov: '#f97316',
  nadeDecoy: '#a855f7',
  trajectory: '#fff',
  killLine: '#fff',
  heat: { low: '#00f', high: '#f00' },
};

function createMockContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    translate: vi.fn(),
    setLineDash: vi.fn(),
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
  } as unknown as CanvasRenderingContext2D;
}

describe('coach math and projections', () => {
  it('projects radar points with offset and scale', () => {
    const pt: RadarPoint = { x: 200, y: 300 };
    const projected = projectPoint(pt, GEOMETRY);

    expect(projected.x).toBe(200 * 1 + 100);
    expect(projected.y).toBe(300 * 1 + 50);
  });

  it('calculates Euclidean distance between two points', () => {
    const a: RadarPoint = { x: 0, y: 0 };
    const b: RadarPoint = { x: 30, y: 40 };

    expect(pointDistance(a, b)).toBe(50);
  });

  it('calculates distance from point to segment', () => {
    const a: RadarPoint = { x: 0, y: 0 };
    const b: RadarPoint = { x: 100, y: 0 };

    // Point directly above segment
    expect(pointToSegmentDistance({ x: 50, y: 20 }, a, b)).toBe(20);

    // Point before start of segment
    expect(pointToSegmentDistance({ x: -10, y: 0 }, a, b)).toBe(10);

    // Point past end of segment
    expect(pointToSegmentDistance({ x: 120, y: 0 }, a, b)).toBe(20);

    // Degenerate segment (a === b)
    expect(pointToSegmentDistance({ x: 3, y: 4 }, a, a)).toBe(5);
  });
});

describe('coach hit testing', () => {
  it('hits placed utility within threshold and returns null when far', () => {
    const utilities = [
      { id: 'util-1', kind: 'smoke' as const, point: { x: 100, y: 100 } },
      { id: 'util-2', kind: 'flash' as const, point: { x: 200, y: 200 } },
    ];

    expect(findHitUtility(utilities, { x: 105, y: 105 }, 15)?.id).toBe('util-1');
    expect(findHitUtility(utilities, { x: 150, y: 150 }, 15)).toBeNull();
  });

  it('hits strokes by point or segment', () => {
    const strokes = [
      {
        id: 'stroke-1',
        color: '#fff',
        points: [{ x: 50, y: 50 }],
      },
      {
        id: 'stroke-2',
        color: '#fff',
        points: [
          { x: 100, y: 100 },
          { x: 200, y: 100 },
        ],
      },
    ];

    // Single point stroke
    expect(findHitStroke(strokes, { x: 52, y: 52 }, 5)?.id).toBe('stroke-1');

    // Segment stroke
    expect(findHitStroke(strokes, { x: 150, y: 103 }, 5)?.id).toBe('stroke-2');

    // Miss
    expect(findHitStroke(strokes, { x: 300, y: 300 }, 10)).toBeNull();
  });

  it('hits moved player before original position', () => {
    const originals = new Map([
      [asPlayerSlot(0), { x: 100, y: 100 }],
      [asPlayerSlot(1), { x: 200, y: 200 }],
    ]);
    const moved = [{ slot: asPlayerSlot(0), point: { x: 150, y: 150 } }];

    // Slot 0 was moved to (150, 150)
    const hitMoved = findHitPlayerToken(originals, moved, { x: 152, y: 151 }, 10);
    expect(hitMoved?.slot).toBe(asPlayerSlot(0));
    expect(hitMoved?.isMoved).toBe(true);

    // Slot 1 is still at original (200, 200)
    const hitOriginal = findHitPlayerToken(originals, moved, { x: 202, y: 198 }, 10);
    expect(hitOriginal?.slot).toBe(asPlayerSlot(1));
    expect(hitOriginal?.isMoved).toBe(false);

    // Miss
    expect(findHitPlayerToken(originals, moved, { x: 0, y: 0 }, 10)).toBeNull();
  });
});

describe('coach history snapshots', () => {
  it('manages undo and redo stacks accurately', () => {
    let history = createCoachHistory();
    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(0);

    const step1 = {
      ...EMPTY_COACH_ANNOTATIONS,
      strokes: [{ id: 's1', color: '#fff', points: [{ x: 10, y: 10 }] }],
    };
    history = pushCoachSnapshot(history, step1);
    expect(history.past).toHaveLength(1);
    expect(history.present.strokes).toHaveLength(1);

    const step2 = {
      ...step1,
      utilities: [{ id: 'u1', kind: 'smoke' as const, point: { x: 50, y: 50 } }],
    };
    history = pushCoachSnapshot(history, step2);
    expect(history.past).toHaveLength(2);
    expect(history.present.utilities).toHaveLength(1);

    // Undo step 2
    const undone = undoCoachHistory(history);
    expect(undone).not.toBeNull();
    if (undone) {
      history = undone;
      expect(history.present.utilities).toHaveLength(0);
      expect(history.future).toHaveLength(1);

      // Redo step 2
      const redone = redoCoachHistory(history);
      expect(redone).not.toBeNull();
      if (redone) {
        history = redone;
        expect(history.present.utilities).toHaveLength(1);
        expect(history.future).toHaveLength(0);
      }
    }
  });
});

describe('coach drawing execution', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('draws a multi-point stroke on canvas context', () => {
    const stroke = {
      id: 's1',
      color: '#ffffff',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
    };

    drawCoachStroke(ctx, stroke, GEOMETRY);

    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(110, 60);
    expect(ctx.lineTo).toHaveBeenCalledWith(120, 70);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('draws utility marks for smoke, molotov, flash and he', () => {
    const kinds = ['smoke', 'molotov', 'flash', 'he'] as const;

    for (const kind of kinds) {
      const util = { id: `u-${kind}`, kind, point: { x: 50, y: 50 } };
      drawCoachUtility(ctx, util, GEOMETRY, OVERVIEW, COLORS, false);
      expect(ctx.arc).toHaveBeenCalled();
    }
  });

  it('draws moved player token with dashed guide line', () => {
    const moved = { slot: asPlayerSlot(2), point: { x: 100, y: 100 } };
    const orig = { x: 50, y: 50 };

    drawCoachMovedPlayer(ctx, moved, orig, 'CT', 3, GEOMETRY, COLORS, true);

    expect(ctx.setLineDash).toHaveBeenCalledWith([4, 4]);
    expect(ctx.fillText).toHaveBeenCalledWith('3', expect.any(Number), expect.any(Number));
  });

  it('resolves pencil colors from radarColors', () => {
    expect(resolvePencilColor('objective', COLORS)).toBe(COLORS.objective);
    expect(resolvePencilColor('ct', COLORS)).toBe(COLORS.team.CT);
    expect(resolvePencilColor('t', COLORS)).toBe(COLORS.team.T);
    expect(resolvePencilColor('damage', COLORS)).toBe(COLORS.damage);
    expect(resolvePencilColor('ink', COLORS)).toBe(COLORS.selectionRing);
  });
});
