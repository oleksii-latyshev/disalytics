import {
  FLAG_ALIVE,
  FLAG_HELMET,
  type PlayerInfo,
  type PlayerRoundStats,
  type PlayerSlot,
  sampleAt,
  slotSampleIndex,
  type Team,
  type TickTrack,
  UTILITY_NAMES,
  utilityHeld,
  WEAPON_NONE,
  weaponClass,
  weaponIcon,
  weaponName,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { UtilityGlyph, WeaponGlyph } from '@/core/glyphs';
import type { MoneyShape } from '../helpers/money';
import { Money } from './Money';

interface Props {
  player: PlayerInfo;
  side: Team;
  track: TickTrack;
  weapons: readonly string[];
  frame: number;
  isSelected: boolean;
  /**
   * The round's numbers, for the selected row alone. They are drawn on the plate beside the
   * player's own token; this is the same reading in words, because a canvas has none.
   */
  stats: PlayerRoundStats | undefined;
  money: Intl.NumberFormat;
  shape: MoneyShape;
  onSelect: (slot: PlayerSlot) => void;
}

/**
 * How wide the weapon keeps whether or not it is holding anything. The set is drawn to one height
 * and many widths, so a pistol and an AWP are not the same mark — and a slot that shrank to fit
 * would move the name's truncation point every time a player switched weapon, which is #164's
 * finding one size up.
 */
const WEAPON_SLOT = 'flex h-3 w-9 shrink-0 items-center justify-end';

/**
 * Health, as the row's own ground rather than as a rule across it.
 *
 * The bar this replaces was a full-width 3px line in the side's colour, and there were two of them
 * per row: twenty saturated rules across the stage, all of them at 100% for the whole buy phase,
 * carrying nothing. §17 rule 5 says colour is data, and a constant is not data.
 *
 * As a wash the same number is readable across all five rows at once — the card answers *how much
 * of this side is left* without being read row by row — and a dead player is simply an empty row,
 * which is the state the old design needed a word for. The word is still there; the wash is not
 * doing the job alone.
 *
 * It scales, it does not resize: `transform` on `origin-left`, which is what hard rule 9 requires of
 * anything that moves with the readout. It carries no transition for the same reason — this is
 * written ten times a second, and a tween on it would be motion on the reading channel.
 */
function HealthWash({ value, side }: { value: number; side: Team }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute inset-y-0 left-0 w-full origin-left rounded-card ${
        side === 'CT' ? 'bg-ct/8' : 'bg-t/8'
      }`}
      style={{ transform: `scaleX(${Math.min(Math.max(value, 0), 1)})` }}
    />
  );
}

/**
 * One player, live. Everything on the row is read as text, so it arrives at the 10 Hz readout the
 * card above subscribes to rather than on the frame channel (AGENTS.md §8).
 *
 * **The row is two lines and always two lines.** Identity on the first — who, and what they are
 * holding — and state on the second. It was three before, the third of them conditional on holding
 * utility, which gave the card two row heights and a list that stuttered: measured on the fixture at
 * one moment, the two sides were 278px and 321.5px tall for the same five seats. A scoreboard is
 * read *across* rows, and rows that are not the same height cannot be.
 *
 * **Selecting a row does not resize it.** It expanded in place for one build, and the owner's
 * reading of it was that the card jumps — which it does: below the split that jump came straight
 * out of the plate, 459px to 376px, and above it the row still shoved its four neighbours down. The
 * round's numbers are drawn beside the player's own token on the plate now, where the reader is
 * already looking, and selecting a row changes this row's ground and nothing else's geometry.
 *
 * **A canvas has no reading**, so the same four numbers are carried here as `sr-only` text. That is
 * not a leftover: moving them to the plate would otherwise have made a selected player's round
 * unavailable to a screen reader, which is the one direction this screen is not allowed to move in.
 * `sr-only` is out of flow, so it costs the row nothing and cannot bring the jump back.
 */
export function PlayerRow({
  player,
  side,
  track,
  weapons,
  frame,
  isSelected,
  stats,
  money,
  shape,
  onSelect,
}: Props) {
  const t = useT();

  const index = slotSampleIndex(track, frame, player.slot);
  const flags = sampleAt(track.flags, index);
  const isAlive = (flags & FLAG_ALIVE) !== 0;
  const health = sampleAt(track.health, index);
  const armour = sampleAt(track.armour, index);
  const weaponIndex = sampleAt(track.weapon, index);
  const weapon = weaponIndex === WEAPON_NONE ? undefined : weapons.at(weaponIndex);
  const utility = utilityHeld(sampleAt(track.grenades, index));

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(player.slot)}
      className={`relative isolate flex h-full w-full flex-col overflow-hidden rounded-card px-2 py-1.5 text-left transition-colors duration-(--duration-micro) ease-out ${
        isSelected ? 'bg-selected' : 'hover:bg-hover'
      }`}
    >
      {isAlive && <HealthWash value={health / 100} side={side} />}

      {/* The side's own rule, and it is the row's anchor rather than its decoration: it is the one
          mark that survives a player dying, where the wash behind it has gone to nothing. */}
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-0.5 ${side === 'CT' ? 'bg-ct' : 'bg-t'}`}
      />

      <span className="relative flex min-w-0 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-2">
          {/* Truncation is the last resort §11 allows, and it carries the full name with it. */}
          <span className={`min-w-0 truncate text-13 ${isAlive ? 'text-ink' : 'text-ink-dim'}`}>
            {player.name}
          </span>

          <span className={`ms-auto ${WEAPON_SLOT} ${isAlive ? 'text-ink' : 'text-ink-faint'}`}>
            {/* Game vocabulary reaches the label untranslated, and the bomb reaches nothing at
                all: `WeaponGlyph` draws the `C4 Explosive` entry as empty — #137. The name is
                `weaponName`'s rather than the table entry, so a held grenade and the marks below
                it are one name to a screen reader instead of two. */}
            {isAlive && weapon !== undefined && (
              <WeaponGlyph
                weapon={weaponClass(weapon)}
                icon={weaponIcon(weapon)}
                label={weaponName(weapon)}
              />
            )}
          </span>
        </span>

        {/* Money takes a line of its own below the split and shares one above it. That is #218's
            finding, and it is a width rather than a locale: a seat in the strip is 93px of content
            box, where the figure alone runs 15.7px past it in `en` and 23px in `ru`. Wrapping *by
            rule* rather than by whether the content happens to fit is what keeps all five seats the
            same height — a dead row carrying two short words would otherwise not wrap where the
            live row beside it did. */}
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 split:flex-nowrap">
          {/* A fixed 16px line, because the alternative is a plate that creeps. `DEAD` is
              `.label-dense` at 11px and the live marks are 12px type and 12px glyphs, so a row
              measured 64.25px alive and 63px dead — which below the split is a strip that shrinks
              as a side is wiped out and a plate that grows 1.25px under the reader mid-round.
              §5.1's rule is that the plate is sized from this row, so this row does not move. */}
          <span className="flex h-4 min-w-0 shrink-0 items-center gap-1.5">
            {isAlive ? (
              <>
                <span className="numeric shrink-0 text-12 text-ink">
                  <span className="sr-only">
                    <Text path="review.player.health" />{' '}
                  </span>
                  {health}
                </span>

                <span className="sr-only">
                  <Text path="review.player.armour" /> {armour}
                </span>

                {(flags & FLAG_HELMET) !== 0 && (
                  <svg
                    viewBox="0 0 12 12"
                    role="img"
                    aria-label={t('review.player.helmet')}
                    fill="currentColor"
                    className="size-3 shrink-0 text-ink-dim"
                  >
                    <path d="M6 1.6a4.4 4.4 0 0 0-4.4 4.4v2.2h2.2V6a2.2 2.2 0 0 1 4.4 0v2.2h2.2V6A4.4 4.4 0 0 0 6 1.6Z" />
                  </svg>
                )}

                {/* Each mark names itself, and the names are game vocabulary — never translated. Two
                  flashbangs are two marks rather than a counted one, so the bit each came from is
                  what identifies it in the list. */}
                {utility.map((held) => (
                  <UtilityGlyph key={held.bit} kind={held.kind} label={UTILITY_NAMES[held.kind]} />
                ))}
              </>
            ) : (
              /* Dead is a word before it is a colour — §17 rule 5, and the reason the wash behind
               this row is allowed to be the only thing carrying health. */
              <span className="label-dense shrink-0 text-ink-dim">
                <Text path="review.player.dead" />
              </span>
            )}
          </span>

          <span className="numeric flex h-4 w-full shrink-0 items-center justify-end text-12 text-ink-dim split:ms-auto split:w-auto">
            <span className="sr-only">
              <Text path="review.player.money" />{' '}
            </span>
            <Money
              value={sampleAt(track.money, index)}
              money={money}
              shape={shape}
              isSliding={true}
            />
          </span>
        </span>

        {isSelected && stats !== undefined && (
          <span className="sr-only">
            <Text path="review.player.kills" /> {stats.kills}. <Text path="review.player.deaths" />{' '}
            {stats.deaths}. <Text path="review.player.damage" /> {stats.damage}.{' '}
            <Text path="review.player.equipment" /> {money.format(stats.equipmentValue)}.
          </span>
        )}
      </span>
    </button>
  );
}
