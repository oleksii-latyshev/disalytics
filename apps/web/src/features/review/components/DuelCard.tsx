import type { PlayerInfo, PlayerSlot, Team } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { KillMark, WeaponGlyph } from '@/core/glyphs';
import { DUEL_LEAD_IN_SECONDS, type DuelDetail, type DuelEnd } from '../helpers/map-scope';

interface Props {
  detail: DuelDetail | undefined;
  players: readonly PlayerInfo[];
}

const SIDE_INK: Readonly<Record<Team, string>> = { CT: 'text-ct', T: 'text-t' };

function End({ end, nameOf }: { end: DuelEnd; nameOf: (slot: PlayerSlot) => string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span
        className={`min-w-0 truncate ${end.side === undefined ? 'text-ink' : SIDE_INK[end.side]}`}
      >
        {nameOf(end.slot)}
      </span>

      <span className="flex min-w-0 items-center gap-1.5 text-12 text-ink-dim">
        {end.weapon === null ? (
          <Text path="review.maps.duel.nothing" />
        ) : (
          <>
            <WeaponGlyph weapon={end.weapon.weaponClass} icon={end.weapon.icon} />
            {/* Game vocabulary, untranslated. */}
            <span className="min-w-0 truncate">{end.weapon.name}</span>
          </>
        )}
        <span className="numeric ml-auto shrink-0">
          <Text
            path="review.maps.duel.vitals"
            values={{ health: end.health, armour: end.armour }}
          />
        </span>
      </span>
    </div>
  );
}

/**
 * What both players of the duel under the pointer or the focus were holding, and what they had left
 * — #387. It restates the row rather than replacing it: the row's own name already carries the
 * weapon and the marks, so a reader who never sees this card loses the vitals and nothing else.
 *
 * **Its height is held whether or not a duel is chosen.** It sits under the list, and a card that
 * grew on hover would shorten the list and slide the row out from under the pointer.
 */
export function DuelCard({ detail, players }: Props) {
  const t = useT();

  const nameOf = (slot: PlayerSlot) =>
    players.find((player) => player.slot === slot)?.name ?? t('review.feed.unknownPlayer');

  return (
    <div className="flex h-[9.5rem] flex-col gap-1.5 overflow-hidden rounded-card bg-surface-2 p-2.5 text-13">
      {detail === undefined ? (
        <p className="text-ink-dim leading-prose">
          <Text path="review.maps.duel.empty" />
        </p>
      ) : (
        <>
          <p className="flex items-center justify-between gap-2 label-dense text-ink-dim">
            <Text path="review.maps.duel.before" />
            <span className="flex items-center gap-1 text-ink">
              {detail.isHeadshot && <KillMark kind="headshot" />}
              {detail.isWallbang && <KillMark kind="wallbang" />}
              {detail.isThroughSmoke && <KillMark kind="smoke" />}
            </span>
          </p>

          <End end={detail.attacker} nameOf={nameOf} />
          <End end={detail.victim} nameOf={nameOf} />

          <p className="mt-auto text-12 text-ink-dim">
            <Text path="review.maps.duel.lead" values={{ seconds: DUEL_LEAD_IN_SECONDS }} />
          </p>
        </>
      )}
    </div>
  );
}
