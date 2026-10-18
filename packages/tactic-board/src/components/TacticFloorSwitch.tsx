import { useT } from '@disa/i18n';
import { type MapOverview, mapFloors } from '@disa/map-data';
import { cn } from '@disa/ui';
import { floorName } from '../helpers/tactic-floor-name';

export interface TacticFloorSwitchProps {
  readonly overview: MapOverview;
  /** The floor in view, as a position in `mapFloors`. */
  readonly floor: number;
  readonly onFloor: (floor: number) => void;
  readonly className?: string | undefined;
}

/**
 * Which floor of the map the plate shows, one at a time. Only a map with more than one has it. The
 * buttons are plain toggles, so Tab reaches them and Enter or Space presses one; what is on the
 * other floor stays on the plate, faded.
 */
export function TacticFloorSwitch({ overview, floor, onFloor, className }: TacticFloorSwitchProps) {
  const t = useT();
  const floors = mapFloors(overview);
  if (floors.length < 2) return null;

  return (
    <fieldset
      title={t('library.tactics.board.floors.tip')}
      className={cn(
        'absolute top-14 right-2.5 m-0 flex min-w-0 flex-col gap-0.5 rounded-card border border-line bg-surface-0/85 p-0.5',
        className,
      )}
    >
      <legend className="sr-only">{t('library.tactics.board.floors.label')}</legend>
      {floors.map((entry, index) => {
        const isOn = index === floor;
        return (
          <button
            key={entry.id}
            type="button"
            aria-pressed={isOn}
            onClick={() => onFloor(index)}
            className={cn(
              'h-7 rounded-chip px-2.5 text-left text-13 whitespace-nowrap transition-colors',
              isOn ? 'bg-ink font-semibold text-surface-0' : 'text-ink-dim hover:bg-hover',
            )}
          >
            {floorName(t, entry.id)}
          </button>
        );
      })}
    </fieldset>
  );
}
