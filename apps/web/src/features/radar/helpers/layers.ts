import { FLAG_ALIVE, type Frame, sampleAt, type Team, type TickTrack } from '@disa/demo-core';
import { type MapOverview, RADAR_IMAGE_SIZE, worldToRadar } from '@disa/map-data';
import type { Layer } from '@/core/renderer';
import type { RadarColors } from './colors';
import { levelIndexAt } from './levels';

const TOKEN_RADIUS_PX = 5;
const TOKEN_OUTLINE_PX = 1.5;

/** A player standing on a level the map is not currently showing, seen through the floor. */
const OTHER_LEVEL_ALPHA = 0.25;

export function radarBackdrop(image: HTMLImageElement): Layer {
  return (context, size) => {
    context.drawImage(image, 0, 0, size.width, size.height);
  };
}

/**
 * Side identity carries in shape as well as colour — `DESIGN.md` §2 rules out relying on hue,
 * which a colour-blind reader may not have.
 */
function traceToken(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  team: Team,
  radius: number,
): void {
  context.beginPath();

  if (team === 'CT') {
    context.arc(x, y, radius, 0, 2 * Math.PI);
    return;
  }

  context.moveTo(x, y - radius);
  context.lineTo(x + radius, y);
  context.lineTo(x, y + radius);
  context.lineTo(x - radius, y);
  context.closePath();
}

export interface PlayerTokensOptions {
  readonly track: TickTrack;
  readonly frame: Frame;
  readonly overview: MapOverview;
  readonly levelIndex: number;
  readonly teamBySlot: readonly (Team | undefined)[];
  readonly colors: RadarColors;
}

export function playerTokens(options: PlayerTokensOptions): Layer {
  const { track, frame, overview, levelIndex, teamBySlot, colors } = options;

  return (context, size) => {
    if (track.frameCount === 0) return;

    const pixelsPerRadarPixel = size.width / RADAR_IMAGE_SIZE;
    const base = frame * track.slotCount;

    context.lineWidth = TOKEN_OUTLINE_PX;
    context.strokeStyle = colors.outline;

    for (let slot = 0; slot < track.slotCount; slot++) {
      const sample = base + slot;
      if ((sampleAt(track.flags, sample) & FLAG_ALIVE) === 0) continue;

      const team = teamBySlot[slot];
      if (team === undefined) continue;

      const position = worldToRadar(overview, {
        x: sampleAt(track.posX, sample),
        y: sampleAt(track.posY, sample),
      });

      const isOnShownLevel = levelIndexAt(overview, sampleAt(track.posZ, sample)) === levelIndex;

      context.globalAlpha = isOnShownLevel ? 1 : OTHER_LEVEL_ALPHA;
      context.fillStyle = colors.team[team];

      traceToken(
        context,
        position.x * pixelsPerRadarPixel,
        position.y * pixelsPerRadarPixel,
        team,
        TOKEN_RADIUS_PX,
      );
      context.fill();
      context.stroke();
    }
  };
}
