import {
  type Duel,
  matchDuels,
  type ParsedDemo,
  type PlayerSlot,
  type Team,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { useMemo, useState } from 'react';
import { DuelPlate } from '@/features/radar';
import { type ChoiceOption, SettingChoice } from './SettingChoice';

/** `all` is not a side, and it is first because the match is what the screen opens on. */
type SideScope = 'all' | Team;

/** How many duels each slot has, indexed by slot, over whatever the side scope has left. */
function duelsBySlot(duels: readonly Duel[]): readonly number[] {
  const counts: number[] = [];

  for (const duel of duels) counts[duel.attacker] = (counts[duel.attacker] ?? 0) + 1;

  return counts;
}

/**
 * The match's duels, on the map they happened on — `ROADMAP.md` M5's duel map, and the first
 * reading behind the **Maps** seat #360 built.
 *
 * **A duel belongs to whoever made it.** Both narrowings read the attacker: a side's duels are the
 * kills it got, and a player's are the kills they got. That is the rule `isBySubject` already
 * applies on the round axis, and making the two disagree would mean a kill that counts for a player
 * in one place and against them in another.
 *
 * **A narrowing that leaves nothing says `0 duels` and draws the bare map.** There is no sentence
 * for it: the count line is already that reading, and a second statement of the same fact is what
 * #205 took off the corner of the stage.
 *
 * **The narrowing is not remembered.** #313's four axis filters are, because they hide marks on a
 * screen the reader did not come to for them and can forget they left on; this screen *is* the
 * reading, its two controls are beside the drawing they change, and leaving it is the whole gesture
 * that ends them.
 */
export function MatchMaps({ demo }: { demo: ParsedDemo }) {
  const t = useT();

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

  // A side is game vocabulary and stays in English; only the word for *both* of them is a string.
  const sideOptions: readonly ChoiceOption<SideScope>[] = [
    { value: 'all', label: <Text path="review.maps.bothSides" /> },
    { value: 'CT', label: 'CT' },
    { value: 'T', label: 'T' },
  ];

  return (
    /* Below the split the controls are a strip above the map rather than a column beside it, which
       is `TeamCard`'s own answer at another size: a column there took the plate to 121px, because
       the plate is sized from the row this grid leaves it. */
    <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 split:grid-cols-[minmax(min-content,17.5rem)_minmax(0,1fr)] split:grid-rows-[minmax(0,1fr)]">
      <aside
        aria-label={t('review.maps.controls')}
        className="surface-card flex min-h-0 min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-float p-3 split:flex-col split:flex-nowrap split:items-stretch split:gap-3 split:overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-2 split:self-stretch">
          <h2 className="label-dense text-ink-dim">
            <Text path="review.maps.sides" />
          </h2>

          <SettingChoice
            labelPath="review.maps.sides"
            value={side}
            options={sideOptions}
            onChange={setSide}
          />
        </div>

        <p className="numeric text-13 text-ink">
          <Text path="review.maps.duels" values={{ count: shown.length }} />
        </p>

        {/* The roster is the narrowing and the legend at once: a name with no duels in the current
            scope states that by its own figure rather than by leaving the list. */}
        <ul
          aria-label={t('review.maps.roster')}
          className="flex min-w-0 list-none gap-0.5 overflow-x-auto split:flex-col split:overflow-x-visible"
        >
          <li className="shrink-0 split:shrink">
            <button
              type="button"
              aria-pressed={subject === null}
              onClick={() => setSubject(null)}
              className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-card px-2 py-1.5 text-13 transition-colors duration-(--duration-micro) ease-out hover:text-ink ${
                subject === null ? 'bg-selected text-ink' : 'text-ink-dim'
              }`}
            >
              <Text path="review.maps.everyone" />
              <span className="numeric shrink-0">{onSide.length}</span>
            </button>
          </li>

          {demo.header.players.map((player) => (
            <li key={player.slot} className="min-w-0 shrink-0 split:shrink">
              <button
                type="button"
                aria-pressed={subject === player.slot}
                onClick={() =>
                  setSubject((current) => (current === player.slot ? null : player.slot))
                }
                className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-card px-2 py-1.5 text-13 transition-colors duration-(--duration-micro) ease-out hover:text-ink ${
                  subject === player.slot ? 'bg-selected text-ink' : 'text-ink-dim'
                }`}
              >
                <span className="min-w-0 truncate">{player.name}</span>
                <span className="numeric shrink-0">{counts[player.slot] ?? 0}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* The other two readings this seat promises are listed the way the shell lists its own
            unfinished screens: what ships is the map, and each of them is its own row. */}
        <p className="mt-auto text-13 text-ink-dim leading-prose">
          <Text path="review.maps.soonNote" />
        </p>
      </aside>

      <section className="grid min-h-0 min-w-0">
        <DuelPlate demo={demo} duels={shown} />
      </section>
    </div>
  );
}
