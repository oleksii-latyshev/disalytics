import {
  createClock,
  type Frame,
  type ParsedDemo,
  roundIndexAtFrame,
  sidesBySlotAtRound,
} from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview } from '@disa/map-data';
import { useMemo, useRef } from 'react';
import { useCanvasLayers } from '@/core/renderer';
import { useSetting } from '@/core/settings';
import { useFontReady } from '@/shared/hooks';
import { radarBackdrop } from '../helpers/backdrop';
import { radarColors } from '../helpers/colors';
import { labelsBySlot, readLabelStyle } from '../helpers/labels';
import { playerTokens } from '../helpers/token-layer';
import { plateView } from '../helpers/view';
import { useRadarPlate } from '../hooks/use-radar-plate';
import { UnknownMap } from './UnknownMap';

/** Held outside the component so an unmeasurable font does not remount the layer every render. */
const NO_LABELS: readonly string[] = [];

interface Props {
  demo: ParsedDemo;
  /** One position on the sample axis. Nothing here advances it — DESIGN.md §10.2. */
  frame: Frame;
}

function StillCanvas({ demo, frame, overview }: Props & { overview: MapOverview }) {
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

  const layers = useMemo(() => {
    const tokens = playerTokens({
      demo,
      clock: createClock(frame),
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
    frame,
    overview,
    teamBySlot,
    labelBySlot,
    colors,
    labelStyle,
    images,
    layout,
    floorLabels,
  ]);

  const { canvasRef } = useCanvasLayers(layers);

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
export function PlateStill({ demo, frame }: Props) {
  const overview = getMapOverview(demo.header.map);

  return overview === undefined ? (
    <UnknownMap map={demo.header.map} />
  ) : (
    <StillCanvas demo={demo} frame={frame} overview={overview} />
  );
}
