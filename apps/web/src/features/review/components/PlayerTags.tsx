import type { PlayerInfo, PlayerSlot } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { togglePlayer } from '../helpers/map-scope';

interface Props {
  players: readonly PlayerInfo[];
  chosen: readonly PlayerSlot[];
  onChosen: (players: readonly PlayerSlot[]) => void;
  /** What a tag states beside its name: that player's marks over the side the screen is on. */
  figure: (slot: PlayerSlot) => number;
}

const TAG_CLASS =
  'flex min-w-0 max-w-[12rem] items-center gap-1.5 rounded-chip border px-2 py-1 text-13 transition-colors duration-(--duration-micro) ease-out hover:text-ink';

function tagClass(isOn: boolean): string {
  return `${TAG_CLASS} ${isOn ? 'border-line-strong bg-selected text-ink' : 'border-line text-ink-dim'}`;
}

/**
 * Both teams' players as tags across the top of a map screen — #386. Any number can be on, and none
 * on is every player; `Everyone` turns them all off again.
 *
 * **They wrap rather than scroll**, though ten names and their counts fit one 26px line at both
 * 1440×900 and 1024×800 in both locales on the shipped samples. That line is what the plate pays for
 * them: 38px at 1440×900, where the plate is height-bound.
 */
export function PlayerTags({ players, chosen, onChosen, figure }: Props) {
  return (
    <fieldset className="flex min-w-0 flex-wrap gap-1.5">
      <legend className="sr-only">
        <Text path="review.maps.players" />
      </legend>

      <button
        type="button"
        aria-pressed={chosen.length === 0}
        onClick={() => onChosen([])}
        className={tagClass(chosen.length === 0)}
      >
        <Text path="review.maps.everyone" />
      </button>

      {players.map((player) => {
        const isOn = chosen.includes(player.slot);

        return (
          <button
            key={player.slot}
            type="button"
            aria-pressed={isOn}
            onClick={() => onChosen(togglePlayer(chosen, player.slot))}
            className={tagClass(isOn)}
          >
            <span className="min-w-0 truncate">{player.name}</span>
            <span className="numeric shrink-0">{figure(player.slot)}</span>
          </button>
        );
      })}
    </fieldset>
  );
}
