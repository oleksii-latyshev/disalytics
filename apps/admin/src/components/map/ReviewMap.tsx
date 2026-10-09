import type { Lineup, WorldPoint } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview, type MapOverview, plateLayout } from '@disa/map-data';
import { PlateFrame, type PlatePoint, UnknownMap } from '@disa/plate';
import { useState } from 'react';
import { worldPointAt } from '../../helpers/plate-point';
import { MapMarks, type PointName } from './MapMarks';
import { PointHandles } from './PointHandles';

export interface MapView {
  /** The lineups already on the site, drawn faint. */
  readonly stored: readonly Lineup[];
  /** The site's version of the lineup being looked at. */
  readonly counterpart: Lineup | null;
  /** The lineup being looked at; its points can be taken hold of. */
  readonly current: Lineup | null;
  readonly color: string;
  readonly invalid: readonly PointName[];
}

interface Props extends MapView {
  map: string;
  /** Which point the next press on the map places, or `null` when a press does nothing. */
  placing: PointName | null;
  onMove: (name: PointName, point: WorldPoint) => void;
  onPlace: (name: PointName, point: WorldPoint) => void;
}

function Canvas({ overview, ...props }: Props & { overview: MapOverview }) {
  const { current, placing } = props;
  const [drag, setDrag] = useState<{ name: PointName; point: WorldPoint } | null>(null);
  const shown =
    current !== null && drag !== null ? { ...current, [drag.name]: drag.point } : current;

  const handlePlateClick = (plate: PlatePoint) => {
    if (placing === null || current === null) return;
    props.onPlace(placing, worldPointAt(overview, plate, current[placing]));
  };

  const shape = plateLayout(overview);
  return (
    <div
      className="grid max-h-[75vh] w-full"
      style={{ aspectRatio: `${shape.width} / ${shape.height}` }}
    >
      <PlateFrame
        overview={overview}
        isDimmed={false}
        isPlacing={placing !== null}
        onPlateClick={handlePlateClick}
      >
        {(layout) => (
          <>
            <MapMarks
              overview={overview}
              layout={layout}
              stored={props.stored}
              counterpart={props.counterpart}
              current={shown}
              color={props.color}
              invalid={
                drag === null ? props.invalid : props.invalid.filter((name) => name !== drag.name)
              }
            />
            {shown === null ? null : (
              <PointHandles
                overview={overview}
                layout={layout}
                lineup={shown}
                onMove={(name, point) => setDrag({ name, point })}
                onCommit={(name, point) => {
                  setDrag(null);
                  props.onMove(name, point);
                }}
              />
            )}
          </>
        )}
      </PlateFrame>
    </div>
  );
}

/** The map a lineup is looked at on: faint site lineups, the site's version, and the file's. */
export function ReviewMap(props: Props) {
  const t = useT();
  const overview = getMapOverview(props.map);
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {props.placing === null ? null : (
        <p
          role="status"
          className="rounded-chip border border-line-strong bg-surface-2 px-3 py-2 text-13 text-ink"
        >
          {t(props.placing === 'origin' ? 'admin.map.placeOrigin' : 'admin.map.placeLanding')}
        </p>
      )}
      {overview === undefined ? (
        <UnknownMap map={props.map} />
      ) : (
        <Canvas overview={overview} {...props} />
      )}
    </div>
  );
}
