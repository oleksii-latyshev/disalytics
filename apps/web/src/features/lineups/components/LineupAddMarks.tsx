import type { UtilityKind } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import type { PlateLayout } from '@disa/map-data';
import { Button } from '@disa/ui';
import { UTILITY_INK, UtilityGlyph } from '@/core/glyphs';
import type { PlatePoint } from '@/features/radar';
import type { AddStep } from '../helpers/lineup-add';
import { placeStyle } from '../helpers/plate-style';

const PIN =
  'absolute z-8 grid size-7.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full';

interface Props {
  layout: PlateLayout;
  step: AddStep;
  stepNumber: 1 | 2 | 3;
  kind: UtilityKind;
  landing: PlatePoint | null;
  origin: PlatePoint | null;
  /** The landing belongs to a target, so there is nowhere to point at before the throw spot. */
  isLandingFixed: boolean;
  onCancel: () => void;
}

/**
 * What an add flow puts over the plate: a banner that says what to press next, the two points as
 * they are placed, and a pulse where the next press is expected.
 */
export function LineupAddMarks(props: Props) {
  const { layout, step, kind, landing, origin } = props;
  const isPlacing = step !== 'details';
  const pulseAt: PlatePoint | null =
    step === 'land'
      ? { x: layout.width / 2, y: layout.height / 2 }
      : step === 'origin' && !props.isLandingFixed
        ? landing
        : null;

  return (
    <>
      {isPlacing && (
        <div className="lineup-rise absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-card bg-ink py-2 pr-2 pl-3.5 text-surface-0 shadow-float">
          <span className="numeric font-semibold text-11 tracking-wide opacity-70">
            <Text path="library.lineups.addFlow.stepOf" values={{ step: props.stepNumber }} />
          </span>
          <span className="font-semibold text-14">
            <Text
              path={
                step === 'land'
                  ? 'library.lineups.addFlow.bannerLand'
                  : 'library.lineups.addFlow.bannerOrigin'
              }
            />
          </span>
          <Button
            variant="outline"
            onClick={props.onCancel}
            className="h-7.5 border-surface-0/20 px-2.5 text-12 text-surface-0 hover:bg-surface-0/10 hover:border-surface-0/30"
          >
            <Text path="library.lineups.form.cancel" />
          </Button>
        </div>
      )}

      {pulseAt !== null && (
        <span
          aria-hidden="true"
          style={placeStyle(layout, pulseAt)}
          className="lineup-pulse pointer-events-none absolute z-4 size-15 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink"
        />
      )}

      {landing !== null && (
        <span
          aria-hidden="true"
          style={placeStyle(layout, landing)}
          className={`${PIN} border-2 border-current bg-surface-1 ${UTILITY_INK[kind]}`}
        >
          <UtilityGlyph kind={kind} size="control" />
        </span>
      )}

      {origin !== null && (
        <span
          aria-hidden="true"
          style={placeStyle(layout, origin)}
          className={`${PIN} numeric border-2 border-surface-0 bg-ink font-semibold text-12 text-surface-0 ring-2 ring-ink`}
        >
          1
        </span>
      )}
    </>
  );
}
