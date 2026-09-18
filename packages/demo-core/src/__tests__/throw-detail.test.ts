import { describe, expect, it } from 'vitest';
import { throwDetail } from '../helpers/throw-detail';
import type { UtilityThrow } from '../helpers/utility-throws';
import {
  ANGLE_SCALE,
  asFrame,
  asPlayerSlot,
  asTick,
  FLAG_DUCKING,
  FLAG_WALKING,
  type ParsedDemo,
} from '../schema';
import { newEvents, newTrack, withGrenade } from './helpers';

const slot = asPlayerSlot(3);
const landing = { x: 500, y: -200, z: 64 };

function createDemo(options: {
  readonly frameCount?: number;
  readonly setTrack?: (track: ReturnType<typeof newTrack>) => void;
}): ParsedDemo {
  const track = newTrack({ frameCount: options.frameCount ?? 100 });
  if (options.setTrack !== undefined) {
    options.setTrack(track);
  }

  const events = withGrenade(newEvents(), {
    throwTick: asTick(160),
    thrower: slot,
    detonationPosition: landing,
    type: 'smokegrenade',
  });

  return {
    header: { map: 'de_dust2', tickRate: 64, players: [], weapons: [] },
    track,
    events,
  };
}

function createThrown(frame = 40): UtilityThrow {
  return {
    roundIndex: 2,
    grenade: {
      thrower: slot,
      type: 'smokegrenade',
      throwTick: asTick(frame * 4),
      detonationTick: asTick(frame * 4 + 200),
      detonationPosition: landing,
      expiryTick: null,
      trajectory: {
        sampleHz: 16,
        firstTick: asTick(frame * 4),
        sampleCount: 1,
        x: new Float32Array([100]),
        y: new Float32Array([200]),
        z: new Float32Array([50]),
      },
    },
    throwerSide: 'CT',
    frame: asFrame(frame),
    landing,
  };
}

describe('throwDetail', () => {
  it('formats console command with setpos, setang, and movement comment', () => {
    const frame = 40;
    const demo = createDemo({
      setTrack: (t) => {
        for (let f = 30; f <= frame; f++) {
          const c = f * t.slotCount + slot;
          t.posZ[c] = 16.0;
        }
        const cell = frame * t.slotCount + slot;
        t.posX[cell] = -123.5;
        t.posY[cell] = 789.25;
        t.pitch[cell] = Math.round(-15.5 * ANGLE_SCALE);
        t.yaw[cell] = Math.round(85.25 * ANGLE_SCALE);
      },
    });

    const detail = throwDetail(demo, createThrown(frame));

    expect(detail.pitch).toBeCloseTo(-15.5, 2);
    expect(detail.yaw).toBeCloseTo(85.25, 2);
    expect(detail.playerPos.x).toBeCloseTo(-123.5, 2);
    expect(detail.playerPos.y).toBeCloseTo(789.25, 2);
    expect(detail.playerPos.z).toBeCloseTo(16.0, 2);
    expect(detail.command).toBe('setpos -123.50 789.25 16.00; setang -15.50 85.25 0 // Stand');
    expect(detail.throwType).toBe('stand');
    expect(detail.movementKeys).toEqual(['Stand']);
  });

  it('detects crouch throw when FLAG_DUCKING is set', () => {
    const frame = 40;
    const demo = createDemo({
      setTrack: (t) => {
        const cell = frame * t.slotCount + slot;
        t.posX[cell] = 100;
        t.posY[cell] = 200;
        t.posZ[cell] = 0;
        t.flags[cell] = FLAG_DUCKING;
      },
    });

    const detail = throwDetail(demo, createThrown(frame));

    expect(detail.throwType).toBe('crouch');
    expect(detail.movementKeys).toContain('Ctrl');
    expect(detail.command).toContain('// Ctrl + Stand');
  });

  it('detects forward running throw (W)', () => {
    const frame = 40;
    const demo = createDemo({
      setTrack: (t) => {
        const throwCell = frame * t.slotCount + slot;
        t.posX[throwCell] = 100;
        t.posY[throwCell] = 200;
        t.posZ[throwCell] = 0;
        t.speed[throwCell] = 215;
        // facing North (yaw = 90 deg)
        t.yaw[throwCell] = Math.round(90 * ANGLE_SCALE);

        // 16 frames earlier, was at y = 150 (moved North by +50 units forward)
        const prevCell = (frame - 16) * t.slotCount + slot;
        t.posX[prevCell] = 100;
        t.posY[prevCell] = 150;
        t.speed[prevCell] = 215;
      },
    });

    const detail = throwDetail(demo, createThrown(frame));

    expect(detail.throwType).toBe('run');
    expect(detail.movementKeys).toEqual(['W']);
    expect(detail.command).toContain('// W');
  });

  it('detects walking throw (Shift + W)', () => {
    const frame = 40;
    const demo = createDemo({
      setTrack: (t) => {
        const throwCell = frame * t.slotCount + slot;
        t.posX[throwCell] = 100;
        t.posY[throwCell] = 200;
        t.speed[throwCell] = 110;
        t.flags[throwCell] = FLAG_WALKING;
        t.yaw[throwCell] = Math.round(90 * ANGLE_SCALE);

        const prevCell = (frame - 16) * t.slotCount + slot;
        t.posX[prevCell] = 100;
        t.posY[prevCell] = 160;
        t.speed[prevCell] = 110;
        t.flags[prevCell] = FLAG_WALKING;
      },
    });

    const detail = throwDetail(demo, createThrown(frame));

    expect(detail.movementKeys).toEqual(['Shift', 'W']);
    expect(detail.command).toContain('// Shift + W');
  });

  it('detects jump throw and uses ground Z for setpos', () => {
    const frame = 40;
    const demo = createDemo({
      setTrack: (t) => {
        // ground Z is 10.0 up until frame 38
        for (let f = 30; f <= 37; f++) {
          const c = f * t.slotCount + slot;
          t.posZ[c] = 10.0;
        }
        // player jumps up: frame 38=22.0, 39=35.0, 40=48.0
        t.posZ[38 * t.slotCount + slot] = 22.0;
        t.posZ[39 * t.slotCount + slot] = 35.0;
        t.posZ[40 * t.slotCount + slot] = 48.0;

        const throwCell = frame * t.slotCount + slot;
        t.posX[throwCell] = 50.0;
        t.posY[throwCell] = -50.0;
        t.yaw[throwCell] = Math.round(0 * ANGLE_SCALE);
      },
    });

    const detail = throwDetail(demo, createThrown(frame));

    expect(detail.throwType).toBe('jump');
    expect(detail.movementKeys).toContain('Jump');
    // playerPos and setpos must use ground Z (10.00), not in-air Z (48.00)
    expect(detail.playerPos.z).toBe(10.0);
    expect(detail.command).toContain('setpos 50.00 -50.00 10.00;');
    expect(detail.command).toContain('// Stand + Jump');
  });

  it('detects strafing throw (A, D, S)', () => {
    const frame = 40;
    const demo = createDemo({
      setTrack: (t) => {
        const throwCell = frame * t.slotCount + slot;
        t.posX[throwCell] = 100;
        t.posY[throwCell] = 200;
        t.speed[throwCell] = 215;
        // facing North (yaw = 90 deg)
        t.yaw[throwCell] = Math.round(90 * ANGLE_SCALE);

        // 16 frames earlier, was at x = 150, y = 250 (moved East and South: -y is backward/S, -x is West/A)
        const prevCell = (frame - 16) * t.slotCount + slot;
        t.posX[prevCell] = 150;
        t.posY[prevCell] = 250;
        t.speed[prevCell] = 215;
      },
    });

    const detail = throwDetail(demo, createThrown(frame));

    expect(detail.throwType).toBe('run');
    expect(detail.movementKeys).toContain('S');
    expect(detail.movementKeys).toContain('A');
  });
});
