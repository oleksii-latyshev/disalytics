import {
  matchUtility,
  type ParsedDemo,
  type PlayerSlot,
  THROWN_UTILITY_KINDS,
  UTILITY_NAMES,
  type UtilityKind,
  type UtilityThrow,
  utilityKindOfGrenade,
} from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { useMemo, useState } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { UtilityPlate } from '@/features/radar';
import { MapScope, type SideScope } from './MapScope';
import { type ChoiceOption, SettingChoice } from './SettingChoice';

/** `all` is not a kind, and it is first because the match is what a map screen opens on. */
type KindScope = 'all' | UtilityKind;

/** How many throws each slot has, indexed by slot, over whatever the scope above has left. */
function throwsBySlot(throws: readonly UtilityThrow[]): readonly number[] {
  const counts: number[] = [];

  for (const thrown of throws) {
    counts[thrown.grenade.thrower] = (counts[thrown.grenade.thrower] ?? 0) + 1;
  }

  return counts;
}

/**
 * The match's utility, on the map it was thrown across — `ROADMAP.md` M5's utility map.
 *
 * **A throw belongs to whoever threw it**, which is why both of `MapScope`'s narrowings read the
 * thrower, the way the duel map's read the attacker.
 *
 * **The kind is a third narrowing, and it is one this screen needs where the duel map needs none.**
 * A match's utility is three to four times its duels — 526 grenades over 24 rounds on the dust2
 * sample against 144 kills — so "where do our smokes land" is a question the reader cannot ask by
 * looking. It is a single answer rather than a set of facets, which is the grammar of the side row
 * above it; #313's facets are on a screen the reader came to for something else.
 */
export function MatchUtility({ demo }: { demo: ParsedDemo }) {
  const [side, setSide] = useState<SideScope>('all');
  const [subject, setSubject] = useState<PlayerSlot | null>(null);
  const [kind, setKind] = useState<KindScope>('all');

  // Derived once per match: this walks every round and every grenade, and nothing on this screen is
  // on a readout, so it must not be re-derived by a press on a control.
  const throws = useMemo(() => matchUtility(demo), [demo]);

  const onKind = useMemo(
    () =>
      kind === 'all'
        ? throws
        : throws.filter((thrown) => utilityKindOfGrenade(thrown.grenade.type) === kind),
    [throws, kind],
  );

  const onSide = useMemo(
    () => (side === 'all' ? onKind : onKind.filter((thrown) => thrown.throwerSide === side)),
    [onKind, side],
  );

  const shown = useMemo(
    () =>
      subject === null ? onSide : onSide.filter((thrown) => thrown.grenade.thrower === subject),
    [onSide, subject],
  );

  // Counted over the side's throws rather than over the match's, so the roster answers "who threw
  // this side's utility" as soon as a side is chosen.
  const counts = useMemo(() => throwsBySlot(onSide), [onSide]);

  // A grenade's name is game vocabulary and stays as `UTILITY_NAMES` gives it; only the word for
  // *all* of them is a string. The glyph is the same mark a team row and the round axis draw.
  const kindOptions: readonly ChoiceOption<KindScope>[] = [
    { value: 'all', label: <Text path="review.maps.everyKind" /> },
    ...THROWN_UTILITY_KINDS.map((thrown) => ({
      value: thrown,
      label: <UtilityGlyph kind={thrown} label={UTILITY_NAMES[thrown]} size="control" />,
    })),
  ];

  return (
    <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 split:grid-cols-[minmax(min-content,17.5rem)_minmax(0,1fr)] split:grid-rows-[minmax(0,1fr)]">
      <MapScope
        side={side}
        onSide={setSide}
        subject={subject}
        onSubject={setSubject}
        players={demo.header.players}
        reading={<Text path="review.maps.throws" values={{ count: shown.length }} />}
        figure={(slot) => (slot === null ? onSide.length : (counts[slot] ?? 0))}
        note={<Text path="review.maps.lineupNote" values={{ hz: demo.track.sampleHz }} />}
        scope={
          <div className="flex items-center justify-between gap-2 split:self-stretch">
            <h2 className="label-dense text-ink-dim">
              <Text path="review.maps.kinds" />
            </h2>

            <SettingChoice
              labelPath="review.maps.kinds"
              value={kind}
              options={kindOptions}
              onChange={setKind}
            />
          </div>
        }
      />

      <section className="grid min-h-0 min-w-0">
        <UtilityPlate demo={demo} throws={shown} />
      </section>
    </div>
  );
}
