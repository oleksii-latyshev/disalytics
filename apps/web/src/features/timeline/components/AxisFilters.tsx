import type { PlayerSlot } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { buttonVariants, ToggleGroup, ToggleGroupItem } from '@disa/ui';
import { User } from 'lucide-react';
import type { ReactNode } from 'react';
import { EventGlyph, UtilityGlyph } from '@/core/glyphs';
import { useSetting } from '@/core/settings';
import { AXIS_FACETS, type AxisFacet } from '../helpers/axis-filter';

/** The subject switch's value inside the group, which is not a facet and must not collide with one. */
const SUBJECT = 'subject';

/**
 * What each facet looks like on the axis, drawn with the axis's own marks rather than with a set of
 * icons chosen for a toolbar: the reader recognises the switch by the shape it turns off.
 *
 * Utility is the one that needs a stand-in. There are six pieces of it and one switch, so the smoke
 * outline is the mark and `hasOwnInk` is off — a green glyph here would say `smoke` where the label
 * says all six, and a colour set on the glyph is one the row cannot dim.
 */
const FACET_MARK: Readonly<Record<AxisFacet, ReactNode>> = {
  kills: <EventGlyph kind="kill" size="control" />,
  utility: <UtilityGlyph kind="smoke" size="control" hasOwnInk={false} />,
  objectives: <EventGlyph kind="plant" size="control" />,
};

interface Props {
  selectedSlot: PlayerSlot | null;
}

/**
 * The round axis's filter: three facets, plus the one narrowing that only makes sense with somebody
 * selected.
 *
 * **It is what un-crowds the axis, and it does so without touching a glyph.** #271 gave a mark the
 * right to collapse to a tick when its neighbour is closer than one glyph's width, which is correct
 * and stays — but on a real match utility is two thirds of everything on the axis, so a round full
 * of legible marks was being reduced by a rule meant for a genuinely simultaneous pair. Turning a
 * facet off takes the glyphs out before their hit slots are measured, the survivors' slots widen,
 * and the collapse hands them their symbols back. The reader thins the round; the axis stops doing
 * it for them.
 *
 * **The state is on the screen, not behind a control.** These preferences outlive the session, and a
 * filter the reader cannot see they left on is a match that is quietly missing its marks the next
 * morning. That is why this is four switches in the row rather than a button that opens them, and it
 * is the reason the settings sheet does not carry them either: a sheet covers the screen whose
 * change is the whole feedback.
 *
 * A facet that is off is drawn the way `EventGlyphs` draws a muted glyph — `--ink-faint`, §14's ink
 * for a mark — so the switch looks like what it does.
 */
export function AxisFilters({ selectedSlot }: Props) {
  const t = useT();

  const [areKillsShown, setKillsShown] = useSetting('areAxisKillsShown');
  const [isUtilityShown, setUtilityShown] = useSetting('isAxisUtilityShown');
  const [areObjectivesShown, setObjectivesShown] = useSetting('areAxisObjectivesShown');
  const [isSelectedOnly, setSelectedOnly] = useSetting('isAxisSelectedOnly');

  const shown: Readonly<Record<AxisFacet, boolean>> = {
    kills: areKillsShown,
    utility: isUtilityShown,
    objectives: areObjectivesShown,
  };

  const value: string[] = AXIS_FACETS.filter((facet) => shown[facet]);
  if (isSelectedOnly) value.push(SUBJECT);

  // The group hands back the whole pressed set, so every switch is written from it. A write of the
  // value a key already holds is a no-op in the store, which is what keeps this from waking three
  // subscribers on every press.
  function handleValueChange(pressed: readonly string[]): void {
    setKillsShown(pressed.includes('kills'));
    setUtilityShown(pressed.includes('utility'));
    setObjectivesShown(pressed.includes('objectives'));
    setSelectedOnly(pressed.includes(SUBJECT));
  }

  function classFor(isOn: boolean): string {
    return `${buttonVariants({ variant: 'ghost', size: 'icon' })} ${
      isOn ? 'text-ink' : 'text-ink-faint'
    }`;
  }

  return (
    <ToggleGroup
      multiple
      aria-label={t('filters.axis.label')}
      value={value}
      onValueChange={handleValueChange}
      className="flex shrink-0 items-center self-center"
    >
      {AXIS_FACETS.map((facet) => (
        <ToggleGroupItem
          key={facet}
          value={facet}
          aria-label={t(`filters.axis.${facet}`)}
          className={classFor(shown[facet])}
        >
          {FACET_MARK[facet]}
        </ToggleGroupItem>
      ))}

      {/* Narrowing to nobody would empty the axis, so the switch is disabled rather than allowed to
          do that — and its name says what would make it work, because a control that is off with no
          reason given reads as broken. The preference is still remembered while it is unreachable:
          selecting a player is what applies it. */}
      <ToggleGroupItem
        value={SUBJECT}
        disabled={selectedSlot === null}
        aria-label={t(selectedSlot === null ? 'filters.axis.noSubject' : 'filters.axis.subject')}
        className={classFor(isSelectedOnly && selectedSlot !== null)}
      >
        <User aria-hidden="true" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
