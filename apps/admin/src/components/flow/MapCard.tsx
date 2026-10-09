import type { Lineup, WorldPoint } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import type { PointName } from '../map/MapMarks';
import { ReviewMap } from '../map/ReviewMap';
import { Card } from './Parts';
import { type Tone, toneColor } from './status';

function Legend() {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-3.5 gap-y-1 p-0 text-12 text-ink-dim">
      <li className="inline-flex items-center gap-1.5">
        <svg width="30" height="12" aria-hidden="true">
          <line x1="4" y1="6" x2="26" y2="6" stroke="currentColor" strokeWidth="2" />
          <circle
            cx="5"
            cy="6"
            r="4"
            fill="var(--color-surface-0)"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="25"
            cy="6"
            r="4.5"
            fill="currentColor"
            fillOpacity=".3"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <Text path="admin.map.legendFile" />
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="30" height="12" aria-hidden="true">
          <line
            x1="4"
            y1="6"
            x2="26"
            y2="6"
            stroke="var(--status-stored)"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        </svg>
        <Text path="admin.map.legendSite" />
      </li>
      <li>
        <Text path="admin.map.legendDrag" />
      </li>
    </ul>
  );
}

/** The map beside a question or an editor, with a key to what is drawn on it. */
export function MapCard({
  map,
  stored,
  counterpart,
  current,
  tone,
  invalid,
  placing,
  onMove,
  className,
}: {
  map: string;
  stored: readonly Lineup[];
  counterpart: Lineup | null;
  current: Lineup | null;
  tone: Tone;
  invalid: readonly PointName[];
  placing: PointName | null;
  onMove: (name: PointName, point: WorldPoint) => void;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col gap-2 p-3 ${className ?? ''}`}>
      <ReviewMap
        map={map}
        stored={stored}
        counterpart={counterpart}
        current={current}
        color={toneColor(tone)}
        invalid={invalid}
        placing={placing}
        onMove={onMove}
        onPlace={onMove}
      />
      <Legend />
    </Card>
  );
}
