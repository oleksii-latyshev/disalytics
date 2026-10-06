import type { PlatePoint } from '@/features/radar';

/** Past this share of the plate's width the card has no room on the right and goes to the left. */
const FLIP_AT = 0.62;

/** Within this share of the plate's top or bottom edge the card is pulled back inside it. */
const EDGE = 0.22;

export interface PeekPlacement {
  readonly side: 'left' | 'right';
  /** Which part of the card sits level with the origin: its top and bottom are for the plate's edges. */
  readonly align: 'start' | 'center' | 'end';
}

/** Which side of an origin its peek card opens on, and how it is held inside the plate's height. */
export function peekPlacement(
  origin: PlatePoint,
  plate: { readonly width: number; readonly height: number },
): PeekPlacement {
  const across = origin.x / plate.width;
  const down = origin.y / plate.height;

  return {
    side: across > FLIP_AT ? 'left' : 'right',
    align: down < EDGE ? 'start' : down > 1 - EDGE ? 'end' : 'center',
  };
}
