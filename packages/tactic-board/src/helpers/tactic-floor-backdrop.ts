import { type NavLevel, RADAR_IMAGE_SIZE } from '@disa/map-data';
import {
  type CanvasSize,
  type Layer,
  type PlateView,
  plateGeometry,
  readPlateGeometry,
  SQUARE_PLATE,
} from '@disa/plate';

/** How much of the dark ground goes over the image where the floor in view is not. */
const SCRIM_ALPHA = 0.8;

function newCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

/**
 * The part of a radar image that a floor covers, at the image's own size, everything else clear.
 * A floor that shares its image with the one above it (Mirage's underpass) is shown by dimming the
 * picture and lifting this part back out of the dimming.
 *
 * Made once per image and floor, never in a draw.
 */
export function liftedFloorImage(image: CanvasImageSource, level: NavLevel): HTMLCanvasElement {
  const size = RADAR_IMAGE_SIZE;
  const mask = newCanvas(size);
  const maskContext = mask.getContext('2d');
  const lifted = newCanvas(size);
  const context = lifted.getContext('2d');
  if (maskContext === null || context === null) return lifted;

  for (let cy = 0; cy < level.size; cy++) {
    for (let cx = 0; cx < level.size; cx++) {
      if (level.walkable[cy * level.size + cx] !== 1) continue;
      maskContext.fillRect(cx * level.cell, cy * level.cell, level.cell, level.cell);
    }
  }
  context.drawImage(image, 0, 0, size, size);
  context.globalCompositeOperation = 'destination-in';
  context.drawImage(mask, 0, 0);
  return lifted;
}

/**
 * Over the radar image: the dark ground dimming all of it, then the lifted floor back at full
 * strength, so the floor in view reads as the one lit part of a shared picture.
 */
export function floorScrim(
  lifted: CanvasImageSource,
  ground: string,
  view: { readonly current: PlateView },
): Layer {
  const geometry = plateGeometry();

  return (context: CanvasRenderingContext2D, size: CanvasSize) => {
    readPlateGeometry(view.current, size, SQUARE_PLATE, geometry);
    const side = SQUARE_PLATE.width * geometry.scale;

    context.save();
    context.globalAlpha = SCRIM_ALPHA;
    context.fillStyle = ground;
    context.fillRect(geometry.offsetX, geometry.offsetY, side, side);
    context.restore();
    context.drawImage(lifted, geometry.offsetX, geometry.offsetY, side, side);
  };
}
