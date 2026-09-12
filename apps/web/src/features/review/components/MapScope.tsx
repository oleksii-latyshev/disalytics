import type { PlayerInfo, PlayerSlot, Team } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import type { ReactNode } from 'react';
import { type ChoiceOption, SettingChoice } from './SettingChoice';

/** `all` is not a side, and it is first because the match is what a map screen opens on. */
export type SideScope = 'all' | Team;

interface Props {
  side: SideScope;
  onSide: (side: SideScope) => void;
  subject: PlayerSlot | null;
  onSubject: (subject: PlayerSlot | null) => void;
  players: readonly PlayerInfo[];
  /** What the drawing beside this adds up to, stated once above the roster. */
  reading: ReactNode;
  /** What a seat states beside its name; `null` is the seat for the whole side scope. */
  figure: (slot: PlayerSlot | null) => ReactNode;
  /** What this map does not draw yet, at the foot. */
  note: ReactNode;
}

const SEAT_CLASS =
  'flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-card px-2 py-1.5 text-13 transition-colors duration-(--duration-micro) ease-out hover:text-ink';

function seatClass(isChosen: boolean): string {
  return `${SEAT_CLASS} ${isChosen ? 'bg-selected text-ink' : 'text-ink-dim'}`;
}

/**
 * The narrowing every map-shaped reading of a match carries: a side, and one player inside it.
 *
 * **Both narrowings read whoever did the thing.** A side's duels are the kills it got and a side's
 * ground is where its own players stood, which is `isBySubject`'s rule on the round axis: a reading
 * that counted a player one way here and the other way there would be two readings.
 *
 * **The narrowing is not remembered.** #313's four axis filters are, because they hide marks on a
 * screen the reader did not come to for them; a map screen *is* its reading, its controls stand
 * beside the drawing they change, and leaving is the whole gesture that ends them.
 *
 * Below the split this is a strip above the map rather than a column beside it, which is
 * `TeamCard`'s own answer at another size: a column there is a grid row, and the plate is measured
 * from what the row leaves — the first draft of #362 took it to 121px at 1024×800.
 */
export function MapScope({
  side,
  onSide,
  subject,
  onSubject,
  players,
  reading,
  figure,
  note,
}: Props) {
  const t = useT();

  // A side is game vocabulary and stays in English; only the word for *both* of them is a string.
  const sideOptions: readonly ChoiceOption<SideScope>[] = [
    { value: 'all', label: <Text path="review.maps.bothSides" /> },
    { value: 'CT', label: 'CT' },
    { value: 'T', label: 'T' },
  ];

  return (
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
          onChange={onSide}
        />
      </div>

      <p className="numeric text-13 text-ink">{reading}</p>

      {/* The roster is the narrowing and the legend at once: a name with nothing in the current
          scope states that by its own figure rather than by leaving the list. */}
      <ul
        aria-label={t('review.maps.roster')}
        className="flex min-w-0 list-none gap-0.5 overflow-x-auto split:flex-col split:overflow-x-visible"
      >
        <li className="shrink-0 split:shrink">
          <button
            type="button"
            aria-pressed={subject === null}
            onClick={() => onSubject(null)}
            className={seatClass(subject === null)}
          >
            <Text path="review.maps.everyone" />
            <span className="numeric shrink-0">{figure(null)}</span>
          </button>
        </li>

        {players.map((player) => (
          <li key={player.slot} className="min-w-0 shrink-0 split:shrink">
            <button
              type="button"
              aria-pressed={subject === player.slot}
              onClick={() => onSubject(subject === player.slot ? null : player.slot)}
              className={seatClass(subject === player.slot)}
            >
              <span className="min-w-0 truncate">{player.name}</span>
              <span className="numeric shrink-0">{figure(player.slot)}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-auto text-13 text-ink-dim leading-prose">{note}</p>
    </aside>
  );
}
