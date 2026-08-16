import {
  type Clock,
  createVisualScratch,
  grenadeRadiusUnits,
  grenadeVisual,
  type ParsedDemo,
  sampleAt,
  tickAtFrame,
  trajectoryClipCount,
  visibleGrenades,
} from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, radarX, radarY } from '@disa/map-data';
import type { Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import {
  drawDecoyPulse,
  drawFlashMark,
  drawHeRing,
  drawMolotovArea,
  drawSmokeCloud,
  drawTrajectory,
} from './grenades';

export interface UtilityLayerOptions {
  readonly demo: ParsedDemo;
  readonly clock: Clock;
  readonly overview: MapOverview;
  readonly colors: RadarColors;
}

/**
 * A `Layer` that paints grenade utility areas on the tactical plate — §6.2. Sits between the
 * backdrop and the player tokens in the draw order, so a smoke cloud is behind the players,
 * not on top of them.
 *
 * The clock is read at draw time. Scratch buffers are allocated once per demo and reused every
 * frame — no allocation in the draw loop.
 */
export function utilityLayer(options: UtilityLayerOptions): Layer {
  const { demo, clock, overview, colors } = options;
  const { events, track } = demo;
  const { grenades } = events;

  // Nothing to draw when there are no grenades.
  if (grenades.length === 0) {
    return () => {};
  }

  // Pre-allocated scratch — reused every frame.
  const visibleIndices = new Int32Array(grenades.length);
  const visual = createVisualScratch();

  return (context, size) => {
    const scale = size.width / RADAR_IMAGE_SIZE;
    const tick = tickAtFrame(track, clock.frame);
    const count = visibleGrenades(grenades, tick, track.tickRate, visibleIndices);

    if (count === 0) return;

    for (let i = 0; i < count; i++) {
      const index = sampleAt(visibleIndices, i);
      const grenade = grenades[index];
      if (grenade === undefined) continue;

      grenadeVisual(grenade, tick, track.tickRate, visual);
      if (visual.phase === null) continue;

      // Trajectory — drawn for in-flight grenades.
      if (visual.phase === 'flight') {
        const clipCount = trajectoryClipCount(grenade, tick, track.tickRate);
        if (clipCount >= 2) {
          drawTrajectory(
            context,
            grenade.trajectory,
            clipCount,
            overview,
            scale,
            colors.trajectory,
          );
        }
        continue; // In flight: only trajectory, no area.
      }

      // Post-detonation visuals need a position.
      if (grenade.detonationPosition === null) continue;

      const screenX = radarX(overview, grenade.detonationPosition.x) * scale;
      const screenY = radarY(overview, grenade.detonationPosition.y) * scale;

      switch (grenade.type) {
        case 'smokegrenade': {
          const radiusPx = (grenadeRadiusUnits('smokegrenade') / overview.scale) * scale;
          drawSmokeCloud(
            context,
            screenX,
            screenY,
            radiusPx,
            visual.alpha,
            visual.remaining,
            colors.nadeSmoke,
          );
          break;
        }

        case 'molotov':
        case 'incgrenade': {
          const radiusPx = (grenadeRadiusUnits(grenade.type) / overview.scale) * scale;
          drawMolotovArea(
            context,
            screenX,
            screenY,
            radiusPx,
            visual.alpha,
            visual.remaining,
            colors.nadeMolotov,
            index,
          );
          break;
        }

        case 'hegrenade': {
          const radiusPx = (grenadeRadiusUnits('hegrenade') / overview.scale) * scale;
          drawHeRing(
            context,
            screenX,
            screenY,
            visual.progress,
            radiusPx,
            visual.phase === 'linger',
            colors.nadeHe,
          );
          break;
        }

        case 'flashbang': {
          drawFlashMark(context, screenX, screenY, visual.progress, colors.blind);
          break;
        }

        case 'decoy': {
          drawDecoyPulse(context, screenX, screenY, visual.pulsePhase, colors.nadeDecoy);
          break;
        }
      }
    }
  };
}
