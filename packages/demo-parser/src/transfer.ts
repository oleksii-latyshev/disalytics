import type { MatchEvents, TickTrack } from '@disa/demo-core';

/**
 * Every buffer in the parsed demo, for the `postMessage` transfer list. A structured clone would
 * copy several hundred megabytes into the main thread while the worker still held the original.
 */
export function transferablesOf(track: TickTrack, events: MatchEvents): ArrayBuffer[] {
  const buffers: ArrayBuffer[] = [
    track.posX.buffer,
    track.posY.buffer,
    track.posZ.buffer,
    track.yaw.buffer,
    track.pitch.buffer,
    track.health.buffer,
    track.flags.buffer,
    track.speed.buffer,
  ];

  for (const grenade of events.grenades) {
    buffers.push(
      grenade.trajectory.x.buffer,
      grenade.trajectory.y.buffer,
      grenade.trajectory.z.buffer,
    );
  }

  return buffers;
}
