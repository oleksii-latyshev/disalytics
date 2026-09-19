import type { MapOverview } from '@disa/map-data';
import { describe, expect, it, vi } from 'vitest';
import type { RadarColors } from '../helpers/colors';
import { grenadeColorOfKind, tacticLayer } from '../helpers/tactic-layer';
import { plateView } from '../helpers/view';
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

const COLORS: RadarColors = {
  team: { CT: '#4fc3f7', T: '#f59e0b' },
  dead: '#64748b',
  selectionRing: '#ffffff',
  selectionEdge: '#000000',
  label: { halo: '#000000', ink: '#ffffff', damage: '#ef4444', leader: '#94a3b8' },
  hollow: '#000000',
  gunfire: '#ffffff',
  countdown: '#ffffff',
  damage: '#ef4444',
  blind: '#facc15',
  objective: '#eab308',
  nadeSmoke: '#a855f7',
  nadeMolotov: '#f97316',
  nadeHe: '#ef4444',
  nadeDecoy: '#06b6d4',
  trajectory: '#ffffff',
  killLine: '#ffffff',
  heat: { low: '#3b82f6', high: '#ef4444' },
};

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    quadraticCurveTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    clearRect: vi.fn(),
    globalAlpha: 1,
    lineWidth: 1,
    strokeStyle: '',
    fillStyle: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
  } as unknown as CanvasRenderingContext2D;
}

describe('grenadeColorOfKind', () => {
  it('maps all utility kinds to their radar colors', () => {
    expect(grenadeColorOfKind('smoke', COLORS)).toBe(COLORS.nadeSmoke);
    expect(grenadeColorOfKind('fire', COLORS)).toBe(COLORS.nadeMolotov);
    expect(grenadeColorOfKind('flash', COLORS)).toBe(COLORS.blind);
    expect(grenadeColorOfKind('he', COLORS)).toBe(COLORS.nadeHe);
    expect(grenadeColorOfKind('decoy', COLORS)).toBe(COLORS.nadeDecoy);
  });
});

describe('tacticLayer', () => {
  it('renders all entities without throwing errors', () => {
    const view = { current: plateView() };
    const layer = tacticLayer({
      overview: OVERVIEW,
      colors: COLORS,
      view,
      side: 'CT',
      players: [
        { slot: 0, x: -1000, y: 500, yaw: 90, label: '1' },
        { slot: 1, x: -800, y: 400, yaw: 180, label: '2' },
      ],
      throws: [
        {
          id: 'throw-1',
          throwerSlot: 0,
          kind: 'smoke',
          from: { x: -1000, y: 500 },
          to: { x: -200, y: 100 },
          releaseTime: 0,
        },
      ],
      flyingGrenades: [
        {
          throwId: 'throw-1',
          kind: 'smoke',
          throwerSlot: 0,
          currentPos: { x: -600, y: 300 },
          progress: 0.5,
          from: { x: -1000, y: 500 },
          to: { x: -200, y: 100 },
        },
      ],
      activeUtilities: [
        {
          throwId: 'throw-old',
          kind: 'smoke',
          position: { x: -200, y: 100 },
          elapsedSinceLanding: 5,
          totalDuration: 18,
        },
      ],
      drawings: [
        {
          id: 'stroke-1',
          color: '#ffffff',
          points: [
            { x: -1000, y: 500 },
            { x: -900, y: 550 },
          ],
        },
      ],
      selectedSlot: 0,
      selectedThrowId: 'throw-1',
    });

    const ctx = createMockContext();
    expect(() => layer(ctx, { width: 500, height: 500 })).not.toThrow();

    // Verify drawing calls occurred
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });
});
