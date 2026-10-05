import type { LineupTarget, LineupVariant, UtilityKind } from '@disa/demo-core';
import type { MapOverview, PlateLayout } from '@disa/map-data';
import { plateX, plateY } from '@disa/map-data';
import { Bookmark } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import type { TargetStack } from '../helpers/target-stacks';

/** The kind is data and so is its colour (§17 rule 4); everything else on a marker is ink. */
const KIND_RING: Readonly<Record<UtilityKind, string>> = {
  he: 'border-nade-he',
  flash: 'border-nade-flash',
  smoke: 'border-nade-smoke',
  fire: 'border-nade-molotov',
  decoy: 'border-nade-decoy',
  kit: 'border-ink-dim',
};

export interface PlateLabels {
  readonly target: (target: LineupTarget) => string;
  readonly origin: (number: number, variant: LineupVariant) => string;
  readonly stack: (targets: number, throws: number) => string;
}

/** The expanded hit area a 24px marker needs to be pressed by a fingertip. */
const MARKER =
  'absolute grid -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border-2 before:absolute before:-inset-2';

const BOOKMARK = 'absolute -right-2 -bottom-2 size-3.5 fill-ink text-surface-0';

function percent(value: number, extent: number): string {
  return `${((value / extent) * 100).toFixed(2)}%`;
}

function sizeClass(throwCount: number): string {
  if (throwCount >= 5) return 'size-8';

  return throwCount >= 2 ? 'size-7' : 'size-6';
}

/** Where a marker's own state leaves it: dim behind a picked target, quiet when thrown once. */
function opacityClass(isDimmed: boolean, isQuiet: boolean): string {
  if (isDimmed) return 'opacity-25';

  return isQuiet ? 'opacity-70' : '';
}

interface TargetMarkerProps {
  members: readonly LineupTarget[];
  isPicked: boolean;
  isDimmed: boolean;
  isSaved: boolean;
  isOpen: boolean;
  style: CSSProperties;
  labels: PlateLabels;
  onSelect: (id: string) => void;
  onToggleStack: (id: string | null) => void;
}

/** One target, or the stack that stands for several whose markers would overlap. */
function TargetMarker({
  members,
  isPicked,
  isDimmed,
  isSaved,
  isOpen,
  style,
  labels,
  onSelect,
  onToggleStack,
}: TargetMarkerProps) {
  const lead = members[0];
  if (lead === undefined) return null;

  const isStack = members.length > 1;
  const throwCount = members.reduce((total, member) => total + member.throwCount, 0);
  const look = isStack
    ? 'size-7 border-surface-0 bg-ink text-surface-0'
    : `${sizeClass(lead.throwCount)} bg-surface-1 ${KIND_RING[lead.kind]}`;
  const ring = isPicked ? 'z-5 ring-2 ring-ink ring-offset-2 ring-offset-surface-0' : '';

  return (
    <button
      type="button"
      aria-label={isStack ? labels.stack(members.length, throwCount) : labels.target(lead)}
      aria-pressed={isPicked}
      aria-expanded={isStack ? isOpen : undefined}
      onClick={() => (isStack ? onToggleStack(isOpen ? null : lead.id) : onSelect(lead.id))}
      style={style}
      className={`${MARKER} ${look} ${ring} ${opacityClass(isDimmed, !isStack && lead.throwCount === 1)}`}
    >
      {isStack ? (
        <span className="numeric font-semibold text-12">{members.length}</span>
      ) : (
        <UtilityGlyph kind={lead.kind} size={lead.throwCount >= 5 ? 'control' : 'row'} />
      )}

      {!isStack && lead.throwCount > 1 && (
        <span className="numeric absolute -top-2 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 font-semibold text-10 text-surface-0">
          {lead.throwCount}
        </span>
      )}

      {!isStack && isSaved && <Bookmark aria-hidden="true" className={BOOKMARK} />}
    </button>
  );
}

interface Props {
  overview: MapOverview;
  layout: PlateLayout;
  stacks: readonly TargetStack[];
  targets: ReadonlyMap<string, LineupTarget>;
  selected: LineupTarget | null;
  activeVariantId: string | null;
  savedVariantIds: ReadonlySet<string>;
  openStack: string | null;
  labels: PlateLabels;
  onSelectTarget: (id: string) => void;
  onSelectVariant: (id: string) => void;
  onOpenStack: (id: string | null) => void;
  stackMenu: (ids: readonly string[]) => ReactNode;
}

/**
 * The lineups view's controls over its plate: a marker per target, a stack where markers would
 * overlap, and the numbered origins of the picked one. They are buttons rather than canvas marks so
 * the keyboard can reach them and a screen reader can read what each one is.
 *
 * **A picked target dissolves the stack it was in**: its marker stands alone, and its neighbours in
 * that stack are not drawn, since a menu that lists them has nowhere to open while a lineup is.
 */
export function TargetMarkers(props: Props) {
  const { overview, layout, stacks, targets, selected, savedVariantIds, openStack, labels } = props;

  const place = (x: number, y: number): CSSProperties => ({
    left: percent(x, layout.width),
    top: percent(y, layout.height),
  });

  return (
    <>
      {stacks.map((stack) => {
        const holdsSelected = selected !== null && stack.ids.includes(selected.id);
        const members = holdsSelected
          ? [selected]
          : stack.ids.flatMap((id) => targets.get(id) ?? []);
        const lead = members[0];
        if (lead === undefined) return null;

        return (
          <TargetMarker
            key={lead.id}
            members={members}
            isPicked={holdsSelected}
            isDimmed={selected !== null && !holdsSelected}
            isSaved={lead.variants.some((variant) => savedVariantIds.has(variant.id))}
            isOpen={openStack === lead.id}
            style={place(stack.x, stack.y)}
            labels={labels}
            onSelect={props.onSelectTarget}
            onToggleStack={props.onOpenStack}
          />
        );
      })}

      {selected?.variants.map((variant, index) => {
        const isActive = variant.id === props.activeVariantId;

        return (
          <button
            key={variant.id}
            type="button"
            aria-label={labels.origin(index + 1, variant)}
            aria-pressed={isActive}
            onClick={() => props.onSelectVariant(variant.id)}
            style={place(
              plateX(overview, variant.origin.x, variant.origin.z),
              plateY(overview, variant.origin.y, variant.origin.z),
            )}
            className={`${MARKER} numeric font-semibold ${isActive ? 'z-7 size-8 border-surface-0 bg-ink text-13 text-surface-0 ring-2 ring-ink' : 'z-6 size-6 border-line-strong bg-surface-3 text-12 text-ink'}`}
          >
            {index + 1}
            {savedVariantIds.has(variant.id) && (
              <Bookmark aria-hidden="true" className={BOOKMARK} />
            )}
          </button>
        );
      })}

      {selected === null &&
        stacks.map((stack) => {
          const anchor = stack.ids[0];
          if (anchor === undefined || openStack !== anchor) return null;

          return (
            <div
              key={anchor}
              role="menu"
              tabIndex={-1}
              onKeyDown={(event) => {
                if (event.key === 'Escape') props.onOpenStack(null);
              }}
              style={place(stack.x, stack.y)}
              className={`absolute z-10 w-64 -translate-y-1/2 ${stack.x > layout.width * 0.6 ? '-translate-x-[calc(100%+1.375rem)]' : 'translate-x-[1.375rem]'}`}
            >
              {props.stackMenu(stack.ids)}
            </div>
          );
        })}
    </>
  );
}
