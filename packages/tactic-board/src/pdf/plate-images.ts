import { effectiveSteps, planById, type Tactic } from '@disa/demo-core';
import type { Translate } from '@disa/i18n';
import {
  type MapOverview,
  mapFloors,
  type NavGrid,
  RADAR_IMAGE_SIZE,
  type RadarTheme,
  radarAssetPath,
} from '@disa/map-data';
import {
  type Layer,
  levelAt,
  type Palette,
  plateView,
  radarColors,
  readCssToken,
  squareBackdrop,
} from '@disa/plate';
import { createTacticClock } from '../helpers/tactic-clock';
import { slotColors } from '../helpers/tactic-colors';
import { enemyMarksByStep } from '../helpers/tactic-enemies';
import { floorScrim, liftedFloorImage } from '../helpers/tactic-floor-backdrop';
import { tacticLayer } from '../helpers/tactic-layer';
import { createMotion } from '../helpers/tactic-motion';
import { createScene } from '../helpers/tactic-scene';
import type { TacticSchedule } from '../helpers/tactic-schedule';
import type { PdfStepSection } from './content';
import { cropImageId, plateImageId } from './layout';
import type { PdfImage } from './write';

/** The plate is drawn at the size the board uses, so tokens and strokes keep the board's proportions. */
const LOGICAL_SIZE = 640;
const PLATE_PIXELS = 1800;
const CROP_MAX_PIXELS = 520;
const JPEG_QUALITY = 0.9;
const FALLBACK_GROUND = '#0b0b0c';

export interface PlateImagesRequest {
  readonly tactic: Tactic;
  readonly overview: MapOverview;
  /** The walkable grids, which give an underpass-like floor its shape on the shared picture. */
  readonly grid?: NavGrid | undefined;
  readonly schedules: ReadonlyMap<string, TacticSchedule>;
  readonly sections: readonly PdfStepSection[];
  readonly palette: Palette;
  readonly radarTheme: RadarTheme;
  /** Where the unhashed `/radar/` images are served from, ending in a slash. */
  readonly imageBase: string;
  /** The `crossOrigin` the radar image is requested with: a plate read back into a PDF needs a clean canvas. */
  readonly imageCrossOrigin?: 'anonymous' | 'use-credentials' | undefined;
  readonly t: Translate;
}

function loadImage(
  source: string,
  crossOrigin: PlateImagesRequest['imageCrossOrigin'],
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    if (crossOrigin !== undefined) image.crossOrigin = crossOrigin;
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', () => resolve(null));
    image.src = source;
  });
}

function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function newCanvas(size: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('The browser gave no 2D context for the PDF plate.');
  return { canvas, context };
}

/** The picture a floor is drawn on, and the part of it a shared floor lifts out of the dimming. */
interface FloorBackdrop {
  readonly image: HTMLImageElement | null;
  readonly lifted: HTMLCanvasElement | null;
}

function layersOf(
  request: PlateImagesRequest,
  section: PdfStepSection,
  floor: number,
  backdrop: FloorBackdrop,
  ground: string,
): readonly Layer[] | null {
  const { tactic, overview, schedules, palette, t } = request;
  const plan = planById(tactic, section.planId);
  const schedule = schedules.get(section.planId);
  if (plan === undefined || schedule === undefined) return null;
  const steps = effectiveSteps(tactic, section.planId);
  const view = { current: plateView() };
  const motion = createMotion(schedule.slotCount);
  motion.isReduced = true;
  const layer = tacticLayer({
    overview,
    colors: radarColors(palette),
    slotColors: slotColors(palette),
    view,
    side: tactic.side,
    schedule,
    step: steps[section.stepIndex],
    stepIndex: section.stepIndex,
    selectedSlot: null,
    clock: createTacticClock(),
    scene: createScene(schedule),
    motion,
    enemyMarks: enemyMarksByStep(steps),
    selectedEnemyId: null,
    enemyRoleLabels: {
      anchor: t('library.tactics.board.enemy.roles.anchor'),
      awp: t('library.tactics.board.enemy.roles.awp'),
      rotator: t('library.tactics.board.enemy.roles.rotator'),
      lurker: t('library.tactics.board.enemy.roles.lurker'),
    },
    preview: { current: null },
    liveStroke: { current: null },
    floor,
  });
  if (backdrop.image === null) return [layer];
  const picture = squareBackdrop(backdrop.image, view);
  return backdrop.lifted === null
    ? [picture, layer]
    : [picture, floorScrim(backdrop.lifted, ground, view), layer];
}

function paint(context: CanvasRenderingContext2D, layers: readonly Layer[], ground: string): void {
  const ratio = PLATE_PIXELS / LOGICAL_SIZE;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = ground;
  context.fillRect(0, 0, PLATE_PIXELS, PLATE_PIXELS);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  const size = { width: LOGICAL_SIZE, height: LOGICAL_SIZE };
  for (const layer of layers) {
    context.save();
    layer(context, size);
    context.restore();
  }
}

function crop(plate: HTMLCanvasElement, region: { x: number; y: number; size: number }): PdfImage {
  const scale = PLATE_PIXELS / RADAR_IMAGE_SIZE;
  const source = region.size * scale;
  const pixels = Math.min(CROP_MAX_PIXELS, Math.round(source));
  const { canvas, context } = newCanvas(pixels);
  context.drawImage(
    plate,
    region.x * scale,
    region.y * scale,
    source,
    source,
    0,
    0,
    pixels,
    pixels,
  );
  return { dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY), format: 'JPEG' };
}

async function backdropOf(
  request: PlateImagesRequest,
  floor: number,
  loaded: Map<number, HTMLImageElement | null>,
): Promise<FloorBackdrop> {
  const info = mapFloors(request.overview)[floor];
  const level = info?.level ?? 0;
  if (!loaded.has(level)) {
    const source = `${request.imageBase}${radarAssetPath(levelAt(request.overview, level), request.radarTheme)}`;
    loaded.set(level, await loadImage(source, request.imageCrossOrigin));
  }
  const image = loaded.get(level) ?? null;
  const grid = request.grid?.levels[floor];
  const lifted =
    info?.isExtra === true && image !== null && grid !== undefined
      ? liftedFloorImage(image, grid)
      : null;
  return { image, lifted };
}

/**
 * One picture per step, drawn with the board's own layer: the routes and grenades of the step, the
 * expected enemies and the players where the step begins, on the radar in the reader's theme and
 * palette, with the first floor in view. A step that also uses another floor gets a picture of that
 * floor too. Throws get a close-up cut from the first picture. A radar image that does not load
 * leaves the plate without a backdrop; a step the board cannot draw has no picture.
 */
export async function renderPlateImages(
  request: PlateImagesRequest,
): Promise<ReadonlyMap<string, PdfImage>> {
  const images = new Map<string, PdfImage>();
  await document.fonts?.ready;
  const loaded = new Map<number, HTMLImageElement | null>();
  const backdrops = new Map<number, FloorBackdrop>();
  const ground = readCssToken('--color-surface-0') || FALLBACK_GROUND;
  const { canvas, context } = newCanvas(PLATE_PIXELS);

  const backdropFor = async (floor: number): Promise<FloorBackdrop> => {
    const known = backdrops.get(floor);
    if (known !== undefined) return known;
    const made = await backdropOf(request, floor, loaded);
    backdrops.set(floor, made);
    return made;
  };

  for (const section of request.sections) {
    const layers = layersOf(request, section, 0, await backdropFor(0), ground);
    if (layers === null) continue;
    paint(context, layers, ground);
    images.set(plateImageId(section.key), {
      dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
      format: 'JPEG',
    });
    for (const entry of section.throws) {
      if (entry.region !== null)
        images.set(cropImageId(section.key, entry.id), crop(canvas, entry.region));
    }

    for (const { floor } of section.floors) {
      const more = layersOf(request, section, floor, await backdropFor(floor), ground);
      if (more === null) continue;
      paint(context, more, ground);
      images.set(plateImageId(section.key, floor), {
        dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
        format: 'JPEG',
      });
    }
    await nextTask();
  }
  return images;
}
