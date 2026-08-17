import { Text } from '@disa/i18n';
import { type MapOverview, type RadarPoint, radarToWorld } from '@disa/map-data';
import { Button } from '@disa/ui';
import { levelAt } from '../helpers/levels';

interface Props {
  overview: MapOverview;
  frame: number;
  levelIndex: number;
  isLevelForced: boolean;
  pointer: RadarPoint | null;
  onLevelChange: (index: number | null) => void;
}

function PointerReadout({ overview, pointer }: Pick<Props, 'overview' | 'pointer'>) {
  if (pointer === null) {
    return (
      <span>
        <Text path="radar.debug.pointerHint" />
      </span>
    );
  }

  const world = radarToWorld(overview, pointer);

  return (
    <span className="numeric">
      <Text
        path="radar.debug.pointerValue"
        values={{
          worldX: Math.round(world.x),
          worldY: Math.round(world.y),
          radarX: Math.round(pointer.x),
          radarY: Math.round(pointer.y),
        }}
      />
    </span>
  );
}

export function RadarDebug({
  overview,
  frame,
  levelIndex,
  isLevelForced,
  pointer,
  onLevelChange,
}: Props) {
  const level = levelAt(overview, levelIndex);

  return (
    <div className="pointer-events-auto flex flex-col gap-3 rounded-float border border-line bg-glass-panel p-4 text-ink shadow-raised">
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
          {level.image}{' '}
          <span className="numeric">
            <Text
              path="radar.debug.altitudeBand"
              values={{ min: level.altitudeMin, max: level.altitudeMax }}
            />
          </span>
        </dd>

        <dt className="label-dense text-ink">
          <Text path="radar.debug.pointer" />
        </dt>
        <dd>
          <PointerReadout overview={overview} pointer={pointer} />
        </dd>
      </dl>

      {overview.levels.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-dense text-ink">
            <Text path="radar.debug.levelOverride" />
          </span>

          <Button
            type="button"
            variant={isLevelForced ? 'outline' : 'secondary'}
            onClick={() => onLevelChange(null)}
          >
            <Text path="radar.debug.levelAuto" />
          </Button>

          {overview.levels.map((option, index) => (
            <Button
              key={option.image}
              type="button"
              variant={isLevelForced && index === levelIndex ? 'secondary' : 'outline'}
              onClick={() => onLevelChange(index)}
            >
              {option.image}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
