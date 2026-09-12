import { type Duel, matchDuels, type ParsedDemo, type PlayerSlot } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { useMemo, useState } from 'react';
import { DuelPlate } from '@/features/radar';
import { MapScope, type SideScope } from './MapScope';

/** How many duels each slot has, indexed by slot, over whatever the side scope has left. */
function duelsBySlot(duels: readonly Duel[]): readonly number[] {
  const counts: number[] = [];

  for (const duel of duels) counts[duel.attacker] = (counts[duel.attacker] ?? 0) + 1;

  return counts;
}

/**
 * The match's duels, on the map they happened on — `ROADMAP.md` M5's duel map.
 *
 * **A duel belongs to whoever made it**, which is why both narrowings read the attacker; `MapScope`
 * carries that rule for every map-shaped reading.
 *
 * **A narrowing that leaves nothing says `0 duels` and draws the bare map.** There is no sentence
 * for it: the count line is already that reading, and a second statement of the same fact is what
 * #205 took off the corner of the stage.
 */
export function MatchDuels({ demo }: { demo: ParsedDemo }) {
  const [side, setSide] = useState<SideScope>('all');
  const [subject, setSubject] = useState<PlayerSlot | null>(null);

  // Derived once per match: this walks every round and every kill, and nothing on this screen is
  // on a readout, so it must not be re-derived by a press on a control.
  const duels = useMemo(() => matchDuels(demo), [demo]);

  const onSide = useMemo(
    () => (side === 'all' ? duels : duels.filter((duel) => duel.attackerSide === side)),
    [duels, side],
  );

  const shown = useMemo(
    () => (subject === null ? onSide : onSide.filter((duel) => duel.attacker === subject)),
    [onSide, subject],
  );

  // Counted over the side's duels rather than over the match's, so the roster answers "who did this
  // side's killing" as soon as a side is chosen.
  const counts = useMemo(() => duelsBySlot(onSide), [onSide]);

  return (
    <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 split:grid-cols-[minmax(min-content,17.5rem)_minmax(0,1fr)] split:grid-rows-[minmax(0,1fr)]">
      <MapScope
        side={side}
        onSide={setSide}
        subject={subject}
        onSubject={setSubject}
        players={demo.header.players}
        reading={<Text path="review.maps.duels" values={{ count: shown.length }} />}
        figure={(slot) => (slot === null ? onSide.length : (counts[slot] ?? 0))}
        note={<Text path="review.maps.worldKillNote" />}
      />

      <section className="grid min-h-0 min-w-0">
        <DuelPlate demo={demo} duels={shown} />
      </section>
    </div>
  );
}
