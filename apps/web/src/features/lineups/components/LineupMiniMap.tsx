import type { Lineup } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { getMapOverview, plateLayout, RADAR_IMAGE_SIZE, radarAssetPath } from '@disa/map-data';
import { UTILITY_INK } from '@/core/glyphs';
import { useSetting } from '@/core/settings';
import { arcPath, ringRadius } from '../helpers/lineup-overlay';
import { miniMapFrame } from '../helpers/mini-map-frame';
import { platePointOf } from '../helpers/plate-point';

/** About how wide the map is on screen, which turns a stroke width in pixels into plate units. */
const SCREEN_WIDTH_PX = 352;

const UNDER_PX = 8;
const ARC_PX = 3;
const DASH_PX = [10, 7] as const;
const ORIGIN_PX = 6;
const ORIGIN_RING_PX = 2.5;
const RING_PX = 2;

interface Props {
  map: string;
  lineup: Lineup;
}

/** Where a throw starts and where it lands, framed close: the stretch of map between them, and the arc. */
export function LineupMiniMap({ map, lineup }: Props) {
  const [theme] = useSetting('radarTheme');
  const overview = getMapOverview(map);
  if (overview === undefined) return null;

  const layout = plateLayout(overview);
  const origin = platePointOf(overview, lineup.origin);
  const landing = platePointOf(overview, lineup.landing);
  const path = [
    origin,
    ...(lineup.waypoints ?? []).map((point) => platePointOf(overview, point)),
    landing,
  ];
  const frame = miniMapFrame(path, layout);
  const unit = frame.width / SCREEN_WIDTH_PX;
  const arc = arcPath(path);

  return (
    <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-card border border-line bg-surface-0">
      <svg
        viewBox={`${frame.x.toFixed(1)} ${frame.y.toFixed(1)} ${frame.width.toFixed(1)} ${frame.height.toFixed(1)}`}
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        className="absolute inset-0 size-full"
      >
        {layout.slots.map((slot, index) => {
          const level = overview.levels[index];
          if (level === undefined) return null;

          return (
            <svg
              key={level.image}
              aria-hidden="true"
              x={slot.x}
              y={slot.y}
              width={slot.width}
              height={slot.height}
              viewBox={`${slot.cropX} ${slot.cropY} ${slot.width} ${slot.height}`}
            >
              <image
                href={`${import.meta.env.BASE_URL}${radarAssetPath(level, theme)}`}
                width={RADAR_IMAGE_SIZE}
                height={RADAR_IMAGE_SIZE}
                opacity={0.85}
              />
            </svg>
          );
        })}

        <circle
          cx={landing.x}
          cy={landing.y}
          r={ringRadius(overview, lineup.kind)}
          fillOpacity={0.2}
          strokeWidth={RING_PX * unit}
          className={`fill-current stroke-current ${UTILITY_INK[lineup.kind]}`}
        />
        <path
          d={arc}
          fill="none"
          strokeLinecap="round"
          strokeWidth={UNDER_PX * unit}
          className="stroke-surface-0"
        />
        <path
          d={arc}
          fill="none"
          strokeLinecap="round"
          strokeWidth={ARC_PX * unit}
          strokeDasharray={DASH_PX.map((length) => length * unit).join(' ')}
          className="stroke-ink"
        />
        <circle
          cx={origin.x}
          cy={origin.y}
          r={ORIGIN_PX * unit}
          strokeWidth={ORIGIN_RING_PX * unit}
          className="fill-ink stroke-surface-0"
        />
      </svg>
      <span className="absolute top-2 left-2 rounded-chip bg-surface-0/80 px-1.5 py-0.5 font-medium text-10 text-ink-dim">
        <Text path="library.lineups.position.fromTo" />
      </span>
    </div>
  );
}
