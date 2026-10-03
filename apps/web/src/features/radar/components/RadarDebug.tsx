import { Text } from '@disa/i18n';
import { type MapOverview, plateToRadar, type RadarPoint, radarToWorld } from '@disa/map-data';

interface Props {
  overview: MapOverview;
  frame: number;
  /** In plate coordinates, which are what a hover over the plate reports. */
  pointer: RadarPoint | null;
}

function PointerReadout({ overview, pointer }: Pick<Props, 'overview' | 'pointer'>) {
  if (pointer === null) {
    return (
      <span>
        <Text path="radar.debug.pointerHint" />
      </span>
    );
  }

  const radar = plateToRadar(overview, pointer.x, pointer.y);
  const world = radarToWorld(overview, radar);

  return (
    <span className="numeric">
      <Text
        path="radar.debug.pointerValue"
        values={{
          worldX: Math.round(world.x),
          worldY: Math.round(world.y),
          radarX: Math.round(radar.x),
          radarY: Math.round(radar.y),
        }}
      />
    </span>
  );
}

function LevelReadout({ overview, pointer }: Pick<Props, 'overview' | 'pointer'>) {
  if (pointer === null) return <span>–</span>;

  const level = overview.levels[plateToRadar(overview, pointer.x, pointer.y).levelIndex];
  if (level === undefined) return <span>–</span>;

  return (
    <>
      {level.image}{' '}
      <span className="numeric">
        <Text
          path="radar.debug.altitudeBand"
          values={{ min: level.altitudeMin, max: level.altitudeMax }}
        />
      </span>
    </>
  );
}

export function RadarDebug({ overview, frame, pointer }: Props) {
  return (
    <div className="pointer-events-auto flex flex-col gap-3 rounded-float border border-line bg-surface-1 p-4 text-ink">
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-1 text-13">
        <dt className="label-dense text-ink">
          <Text path="radar.debug.map" />
        </dt>
        <dd>{overview.id}</dd>

        <dt className="label-dense text-ink">
          <Text path="radar.debug.frame" />
        </dt>
        <dd className="numeric">{frame}</dd>

        <dt className="label-dense text-ink">
          <Text path="radar.debug.level" />
        </dt>
        <dd>
          <LevelReadout overview={overview} pointer={pointer} />
        </dd>

        <dt className="label-dense text-ink">
          <Text path="radar.debug.pointer" />
        </dt>
        <dd>
          <PointerReadout overview={overview} pointer={pointer} />
        </dd>
      </dl>
    </div>
  );
}
