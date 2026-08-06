import { newEvents, newTrack, withGrenade } from '@disa/demo-core/test-helpers';
import { describe, expect, it } from 'vitest';
import { transferablesOf } from '../transfer';

describe('transferablesOf', () => {
  it('lists every buffer of the track', () => {
    const track = newTrack();

    expect(transferablesOf(track, newEvents())).toEqual([
      track.posX.buffer,
      track.posY.buffer,
      track.posZ.buffer,
      track.yaw.buffer,
      track.pitch.buffer,
      track.health.buffer,
      track.flags.buffer,
      track.speed.buffer,
    ]);
  });

  it('adds three buffers per grenade, or a flight path arrives without its samples', () => {
    const events = withGrenade(withGrenade(newEvents()));

    expect(transferablesOf(newTrack(), events)).toHaveLength(8 + 2 * 3);
  });

  it('never names a buffer twice, which would detach it mid-transfer', () => {
    const buffers = transferablesOf(newTrack(), withGrenade(newEvents()));

    expect(new Set(buffers).size).toBe(buffers.length);
  });
});
