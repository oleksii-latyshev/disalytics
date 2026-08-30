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
  weaponName,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { UtilityGlyph, WeaponGlyph } from '@/core/glyphs';

interface Props {
  player: PlayerInfo;
  side: Team;
  track: TickTrack;
  weapons: readonly string[];
  frame: number;
  isSelected: boolean;
  /** The round's numbers for this player, which only the expanded row asks for. */
  stats: PlayerRoundStats | undefined;
  money: Intl.NumberFormat;
  onSelect: (slot: PlayerSlot) => void;
}

/** A bar scales rather than resizes: `width` triggers layout and rule 9 bans it at every moment. */
function Bar({ value, className }: { value: number; className: string }) {
  return (
    <span aria-hidden="true" className="block h-[3px] w-full rounded-chip bg-surface-2">
      <span
        className={`block h-full origin-left rounded-chip ${className}`}
        style={{ transform: `scaleX(${Math.min(Math.max(value, 0), 1)})` }}
      />
    </span>
  );
}

function Stat({ path, value }: { path: 'kills' | 'deaths' | 'damage'; value: number }) {
  return (
    <span className="flex items-baseline gap-1">
      <span className="label-dense text-ink-dim">
        <Text path={`review.player.${path}`} />
      </span>
      <span className="numeric text-12">{value}</span>
    </span>
  );
}

/**
 * One player, live — DESIGN.md §5.3. Everything on the row is read as text, so it arrives at the
 * 10 Hz readout the card above subscribes to rather than on the frame channel (AGENTS.md §8).
 *
 * Selecting expands the row in place (§5.6) instead of opening an inspector: an inspector column is
 * dead weight on every screen where nobody is selected, and a drawer over the stage is what
 * principle 4 forbids.
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
      className={`flex w-full flex-col gap-1 rounded-card px-2 py-1.5 text-left transition-colors duration-(--duration-micro) ease-out ${
        isSelected ? 'bg-selected' : 'hover:bg-hover'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-3.5 w-0.5 shrink-0 rounded-chip ${side === 'CT' ? 'bg-ct' : 'bg-t'}`}
        />

        {/* Truncation is the last resort §11 allows, and it carries the full name with it. */}
        <span className={`truncate font-narrow text-13 ${isAlive ? 'text-ink' : 'text-ink-dim'}`}>
          {player.name}
        </span>

        {!isAlive && (
          <span className="label-dense ms-auto shrink-0 text-ink-dim">
            <Text path="review.player.dead" />
          </span>
        )}

        {isAlive && weapon !== undefined && (
          <span className="ms-auto shrink-0 text-ink">
            {/* Game vocabulary reaches the label untranslated, and the bomb reaches nothing at
                all: `WeaponGlyph` draws the `C4 Explosive` entry as empty — §6.4, #137. The name
                is `weaponName`'s rather than the table entry, so a held grenade and the marks
                below it are one name to a screen reader instead of two. */}
            <WeaponGlyph weapon={weaponClass(weapon)} label={weaponName(weapon)} />
          </span>
        )}
      </span>

      {/* The numbers wrap because below the split they cannot do anything else: a seat in §5.1's
          strip is 79px of content box and the health figure, the helmet and the money are 95–107px
          of it that no locale can shrink. Above the split the box is 240px and this line never
          wraps at all. */}
      <span className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Bar value={health / 100} className={side === 'CT' ? 'bg-ct' : 'bg-t'} />
          <Bar value={armour / 100} className="bg-ink-dim" />
        </span>

        <span className="numeric w-8 shrink-0 text-right text-12 text-ink">
          <span className="sr-only">
            <Text path="review.player.health" />{' '}
          </span>
          {health}
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

        <span className="numeric shrink-0 text-12 text-ink-dim">
          <span className="sr-only">
            <Text path="review.player.money" />{' '}
          </span>
          {money.format(sampleAt(track.money, index))}
        </span>
      </span>

      {utility.length > 0 && (
        <span className="flex items-center gap-1">
          {/* Each mark names itself, and the names are game vocabulary — never translated. Two
              flashbangs are two marks rather than a counted one, so the bit each came from is what
              identifies it in the list. */}
          {utility.map((held) => (
            <UtilityGlyph key={held.bit} kind={held.kind} label={UTILITY_NAMES[held.kind]} />
          ))}
        </span>
      )}

      {isSelected && stats !== undefined && (
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
          <Stat path="kills" value={stats.kills} />
          <Stat path="deaths" value={stats.deaths} />
          <Stat path="damage" value={stats.damage} />

          <span className="flex items-baseline gap-1">
            <span className="label-dense text-ink-dim">
              <Text path="review.player.equipment" />
            </span>
            <span className="numeric text-12">{money.format(stats.equipmentValue)}</span>
          </span>
        </span>
      )}
    </button>
  );
}
