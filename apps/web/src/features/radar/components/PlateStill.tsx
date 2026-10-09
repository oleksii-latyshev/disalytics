import {
  createClock,
  type Frame,
  type ParsedDemo,
  roundIndexAtFrame,
  sidesBySlotAtRound,
} from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview } from '@disa/map-data';
import { plateView, radarBackdrop, radarColors, UnknownMap, useRadarPlate } from '@disa/plate';
import { useEffect, useMemo, useRef } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { useFontReady } from '@/shared/hooks';
import { labelsBySlot, readLabelStyle } from '../helpers/labels';
import { playerTokens } from '../helpers/token-layer';

/** Held outside the component so an unmeasurable font does not remount the layer every render. */
const NO_LABELS: readonly string[] = [];

/**
 * A span of a match the plate plays on its own, outside React: the home screen's hero. The clock is
 * a plain object a rAF loop moves and the canvas reads at draw time; `onSample` reports where it
 * stands ten times a second so a readout beside the plate can follow without a frame channel.
 */
export interface PlateReplay {
  readonly from: Frame;
  readonly to: Frame;
  /** Match seconds per real second. */
  readonly rate: number;
  /** Real seconds the plate rests on its last frame before it starts again. */
  readonly holdSeconds: number;
  readonly isPlaying: boolean;
  readonly onSample?: ((frame: number) => void) | undefined;
}

interface Props {
  demo: ParsedDemo;
  /** One position on the sample axis. Nothing here advances it — DESIGN.md §10.2. */
  frame: Frame;
  replay?: PlateReplay | undefined;
}

const MAX_STEP_SECONDS = 0.05;
const SAMPLE_INTERVAL_MS = 100;

function StillCanvas({ demo, frame, replay, overview }: Props & { overview: MapOverview }) {
  const t = useT();

  const [theme] = useSetting('radarTheme');
  const [palette] = useSetting('palette');
  const [arePlayerNamesShown] = useSetting('arePlayerNamesShown');

  const { layout, images, floorLabels } = useRadarPlate(overview, theme);

  // The side a slot holds follows the round being shown rather than the end of the match, which is
  // §10.2's own rule and §6.1's reason for it: sides swap.
  const teamBySlot = useMemo(
    () => sidesBySlotAtRound(demo, roundIndexAtFrame(demo, frame)),
    [demo, frame],
  );

  const colors = radarColors(palette);
  const labelStyle = useMemo(readLabelStyle, []);
  const isLabelFontReady = useFontReady(labelStyle.font);
  const labelBySlot = useMemo(
    () =>
      isLabelFontReady && arePlayerNamesShown
        ? labelsBySlot(demo.header.players, demo.track.slotCount)
        : NO_LABELS,
    [demo.header.players, demo.track.slotCount, isLabelFontReady, arePlayerNamesShown],
  );

  // Fixed at rest: §6.3's zoom is a reading gesture on a match the reader is inside, and this is a
  // picture of one they have not opened yet. The layers read it through a box all the same.
  const viewRef = useRef(plateView());
  const clock = useRef(createClock(frame)).current;

  const layers = useMemo(() => {
    const tokens = playerTokens({
      demo,
      clock,
      overview,
      teamBySlot,
      labelBySlot,
      selectedSlot: null,
      isAudibilityShown: false,
      isPlayerKeysShown: false,
      isPlayerCrosshairShown: false,
      colors,
      labelStyle,
      view: viewRef,
    });

    return images.status === 'ready'
      ? [
          radarBackdrop({
            images: images.images,
            layout,
            floorLabels,
            labelColor: colors.dead,
            view: viewRef,
          }),
          tokens,
        ]
      : [tokens];
  }, [
    demo,
    clock,
    overview,
    teamBySlot,
    labelBySlot,
    colors,
    labelStyle,
    images,
    layout,
    floorLabels,
  ]);

  const { canvasRef, repaint } = useCanvasLayers(layers);

  const from = replay?.from;
  const to = replay?.to;
  const rate = replay?.rate;
  const holdSeconds = replay?.holdSeconds;
  const isPlaying = replay?.isPlaying === true;

  useEffect(() => {
    if (!isPlaying) {
      clock.frame = frame;
      repaint();
    }
  }, [clock, frame, isPlaying, repaint]);
  const onSample = replay?.onSample;

  useEffect(() => {
    if (!isPlaying || from === undefined || to === undefined) return;
    if (rate === undefined || holdSeconds === undefined) return;

    const framesPerSecond = demo.track.sampleHz * rate;
    let request = 0;
    let previous = 0;
    let held = 0;
    const step = (now: number) => {
      const elapsed = previous === 0 ? 0 : Math.min((now - previous) / 1000, MAX_STEP_SECONDS);
      previous = now;

      if (clock.frame >= to) {
        held += elapsed;
        if (held >= holdSeconds) {
          held = 0;
          clock.frame = from;
        }
      } else {
        clock.frame = Math.min(to, Math.max(from, clock.frame) + elapsed * framesPerSecond);
      }
      repaint();
      request = requestAnimationFrame(step);
    };
    const follow = () => {
      cancelAnimationFrame(request);
      previous = 0;
      if (!document.hidden) request = requestAnimationFrame(step);
    };

    clock.frame = from;
    follow();
    const sampler = window.setInterval(() => {
      if (!document.hidden) onSample?.(clock.frame);
    }, SAMPLE_INTERVAL_MS);
    document.addEventListener('visibilitychange', follow);

    return () => {
      cancelAnimationFrame(request);
      window.clearInterval(sampler);
      document.removeEventListener('visibilitychange', follow);
    };
  }, [clock, demo.track.sampleHz, from, holdSeconds, isPlaying, onSample, rate, repaint, to]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={t('radar.label', { map: overview.id })}
      className="w-full rounded-card bg-surface-0"
      style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
    />
  );
}

/**
 * The plate at one frame — DESIGN.md §10.2's demo dialog. **There is no transport and no clock
 * running**: `useCanvasLayers` already paints when its layers change and when the element is
 * resized, so a still is a single draw rather than a frozen playback loop, and nothing here
 * subscribes to a frame channel.
 *
 * It draws the map and the players and stops there. The utility and kill-line layers answer
 * questions a moving plate raises — what is in the air, who shot whom a second ago — and the buy
 * ending is the moment every one of those answers is empty.
 *
 * Audibility is off rather than read from §10.5: the ring is a reading about *now*, and a still has
 * no now to be inside of. Names, theme and palette are the reader's, read where they are obeyed for
 * the reason `RadarView` reads its own — the plate is their only consumer.
 */
export function PlateStill({ demo, frame, replay }: Props) {
  const overview = getMapOverview(demo.header.map);

  return overview === undefined ? (
    <UnknownMap map={demo.header.map} />
  ) : (
    <StillCanvas demo={demo} frame={frame} replay={replay} overview={overview} />
  );
}
