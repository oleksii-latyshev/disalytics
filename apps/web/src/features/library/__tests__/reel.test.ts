import { getMapOverview, RADAR_IMAGE_SIZE, radarX } from '@disa/map-data';
import { describe, expect, it } from 'vitest';
import { WAY_IN_REEL } from '../generated/reel';
import { AGENT_STRIDE, PLAYER_AGENTS, UTILITY_AGENTS } from '../helpers/agents';
import { decodeReel, type ReelSource, sampleReel } from '../helpers/reel';

/**
 * The generator's transform, written forwards so the decoder can be held to inverting it. The two
 * live apart on purpose — `tools/scripts` encodes and the app decodes — and a test that shared the
 * implementation with either of them would agree with a bug in it.
 */
function packPositions(series: readonly (readonly number[])[]): number[] {
  const deltas: number[] = [];

  for (const track of series) {
    let previous = 0;

    for (const value of track) {
      deltas.push(value - previous);
      previous = value;
    }
  }

  return deltas;
}

function aliveBits(bits: readonly boolean[]): number[] {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));

  for (const [at, bit] of bits.entries()) {
    if (bit) bytes[at >> 3] = (bytes[at >> 3] ?? 0) | (1 << (at & 7));
  }

  return [...bytes];
}

const QUANT_ORIGIN = -8192;
const QUANT_UNITS = 1;

const quantise = (world: number) => Math.round((world - QUANT_ORIGIN) * QUANT_UNITS);

/** Two slots over three frames: the first walks along x, the second stands still and dies. */
function stubReel(overrides: Partial<ReelSource> = {}): ReelSource {
  return {
    map: 'de_dust2',
    round: 1,
    hz: 4,
    frameCount: 3,
    stillFrame: 1,
    slotCount: 2,
    quantOrigin: QUANT_ORIGIN,
    quantUnits: QUANT_UNITS,
    positions: packPositions([
      [quantise(0), quantise(100), quantise(200)],
      [quantise(0), quantise(0), quantise(0)],
      [quantise(500), quantise(500), quantise(500)],
      [quantise(500), quantise(500), quantise(500)],
    ]),
    alive: aliveBits([true, true, true, true, false, false]),
    grenades: [],
    ...overrides,
  };
}

describe('decodeReel', () => {
  it('refuses a map map-data does not carry', () => {
    expect(decodeReel(stubReel({ map: 'de_workshop_thing' }))).toBeNull();
  });

  it('inverts the generator: delta, byte split and the world quantisation', () => {
    const reel = decodeReel(stubReel());
    const overview = getMapOverview('de_dust2');

    expect(reel).not.toBeNull();
    expect(overview).toBeDefined();
    if (reel === null || overview === undefined) return;

    // Slot 0, frame 2 walked to world x 200; the reel stores uv, so the assertion goes through the
    // same transform the plate reads rather than a number copied out of a run.
    expect(reel.x[0 * reel.frameCount + 2]).toBeCloseTo(
      radarX(overview, 200) / RADAR_IMAGE_SIZE,
      6,
    );
    expect(reel.x[0 * reel.frameCount + 0]).toBeCloseTo(radarX(overview, 0) / RADAR_IMAGE_SIZE, 6);
    expect(reel.x[1 * reel.frameCount + 1]).toBeCloseTo(
      radarX(overview, 500) / RADAR_IMAGE_SIZE,
      6,
    );
  });
});

describe('sampleReel', () => {
  const out: number[] = new Array((PLAYER_AGENTS + UTILITY_AGENTS) * AGENT_STRIDE).fill(0);

  it('interpolates between two samples rather than stepping', () => {
    const reel = decodeReel(stubReel());
    if (reel === null) throw new Error('stub did not decode');

    sampleReel(reel, 0, out);
    const first = out[0] ?? 0;
    sampleReel(reel, 1 / reel.hz, out);
    const second = out[0] ?? 0;
    sampleReel(reel, 0.5 / reel.hz, out);
    const between = out[0] ?? 0;

    expect(between).toBeCloseTo((first + second) / 2, 6);
  });

  it('takes a dead player off the field', () => {
    const reel = decodeReel(stubReel());
    if (reel === null) throw new Error('stub did not decode');

    sampleReel(reel, 0, out);
    expect(out[AGENT_STRIDE + 2]).toBe(1);

    sampleReel(reel, 1 / reel.hz, out);
    expect(out[AGENT_STRIDE + 2]).toBe(0);
  });

  it('loops the round rather than running off its end', () => {
    const reel = decodeReel(stubReel());
    if (reel === null) throw new Error('stub did not decode');

    sampleReel(reel, 0.5 / reel.hz, out);
    const early = out[0] ?? 0;
    sampleReel(reel, (reel.frameCount + 0.5) / reel.hz, out);

    expect(out[0]).toBeCloseTo(early, 6);
  });

  it('blooms a grenade and then spends it', () => {
    const reel = decodeReel(
      stubReel({
        frameCount: 40,
        positions: packPositions(
          Array.from({ length: 4 }, () => Array.from({ length: 40 }, () => quantise(0))),
        ),
        alive: aliveBits(Array.from({ length: 80 }, () => true)),
        grenades: [
          {
            type: 'smokegrenade',
            detonateFrame: 10,
            endFrame: 30,
            x: quantise(0),
            y: quantise(0),
          },
        ],
      }),
    );
    if (reel === null) throw new Error('stub did not decode');

    const strengthAt = (frame: number) => {
      sampleReel(reel, frame / reel.hz, out);

      return out[PLAYER_AGENTS * AGENT_STRIDE + 2] ?? 0;
    };

    expect(strengthAt(9)).toBe(0);
    expect(strengthAt(12)).toBeGreaterThan(0);
    expect(strengthAt(12)).toBeGreaterThan(strengthAt(25));
    expect(strengthAt(31)).toBe(0);
  });

  it('writes nothing outside the agents the shader draws', () => {
    const reel = decodeReel(stubReel());
    if (reel === null) throw new Error('stub did not decode');

    // The uniform is exactly this long, and a write past it would be a silent out-of-range on a
    // plain array rather than the throw a typed one gives.
    const guarded: number[] = new Array(out.length).fill(0);
    sampleReel(reel, 0, guarded);

    expect(guarded.length).toBe(out.length);
  });
});

describe('the shipped reel', () => {
  it('is a round of the map the field draws', () => {
    expect(WAY_IN_REEL.slotCount).toBeLessThanOrEqual(PLAYER_AGENTS);
    expect(getMapOverview(WAY_IN_REEL.map)).toBeDefined();
    expect(WAY_IN_REEL.stillFrame).toBeLessThan(WAY_IN_REEL.frameCount);
  });

  it('never puts a player off the plate', () => {
    const reel = decodeReel(WAY_IN_REEL);
    if (reel === null) throw new Error('the shipped reel did not decode');

    // Every sample the field can draw is inside the radar image. A quantisation or a transform that
    // drifted would show up here as a player walking off the map rather than as a wrong picture.
    for (const value of [...reel.x, ...reel.y]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('never asks for more utility than the shader carries', () => {
    const reel = decodeReel(WAY_IN_REEL);
    if (reel === null) throw new Error('the shipped reel did not decode');

    const out: number[] = new Array((PLAYER_AGENTS + UTILITY_AGENTS) * AGENT_STRIDE).fill(0);
    let mostDropped = 0;

    for (let frame = 0; frame < reel.frameCount; frame += 1) {
      const live = reel.grenades.filter(
        (grenade) => frame >= grenade.detonateFrame && frame <= grenade.endFrame,
      ).length;
      mostDropped = Math.max(mostDropped, live - UTILITY_AGENTS);
      sampleReel(reel, frame / reel.hz, out);
    }

    expect(mostDropped).toBeLessThanOrEqual(0);
  });
});
