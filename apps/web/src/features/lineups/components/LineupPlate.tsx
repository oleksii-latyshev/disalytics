import { getMapOverview } from '@disa/map-data';
import { UnknownMap } from '@/features/radar/components/UnknownMap';
import { LineupCanvas } from './LineupCanvas';
import type { LineupPlateProps } from './lineup-plate-types';

export type { LineupPlateProps } from './lineup-plate-types';

export function LineupPlate(props: LineupPlateProps) {
  const overview = getMapOverview(props.map);

  return overview === undefined ? (
    <UnknownMap map={props.map} />
  ) : (
    <LineupCanvas key={props.map} overview={overview} {...props} />
  );
}
