import {
  type Duel,
  type Frame,
  matchDuels,
  type ParsedDemo,
  type PlayerSlot,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { useMemo, useState } from 'react';
import { killName, killRow } from '@/core/events';
import { DuelPlate } from '@/features/radar';
import {
  duelDetail,
  isInNarrowing,
  type MapNarrowing,
  stageFrameForDuel,
} from '../helpers/map-scope';
import { DuelCard } from './DuelCard';
import { type MapFeedItem, MapFeedList } from './MapFeedList';
import { SideRow } from './MapScope';
import { PlayerTags } from './PlayerTags';

interface Props {
  demo: ParsedDemo;
  /**
   * Held by the match rather than by this screen (#387): opening a duel on the stage leaves this
   * screen, and coming back to it has to find the narrowing the reader left.
   */
  narrowing: MapNarrowing;
  onNarrowing: (narrowing: MapNarrowing) => void;
  onOpenOnStage: (frame: Frame) => void;
}

/**
 * The match's duels, on the map they happened on, with every one of them as a row beside it — #386.
 *
 * **A duel belongs to whoever made it**, so the side and the tags both read the attacker.
 *
 * **A row pressed is that duel on the stage** (#387), a few seconds before the kill; hovering or
 * focusing one isolates it on the map and fills the card under the list with what both players had.
 */
export function MatchDuels({ demo, narrowing, onNarrowing, onOpenOnStage }: Props) {
  const t = useT();
  const { players } = demo.header;

  // Derived once per match: this walks every round and every kill, and nothing on this screen is
  // on a readout, so it must not be re-derived by a press on a control.
  const duels = useMemo(() => matchDuels(demo), [demo]);

  const onSide = useMemo(
    () =>
      narrowing.side === 'all'
        ? duels
        : duels.filter((duel) => duel.attackerSide === narrowing.side),
    [duels, narrowing.side],
  );

  const shown = useMemo(
    () => duels.filter((duel) => isInNarrowing(narrowing, duel.attackerSide, duel.attacker)),
    [duels, narrowing],
  );

  // Counted over the side's duels rather than the tags', so a tag says what that player did whether
  // or not it is on.
  const counts = useMemo(() => {
    const bySlot: number[] = [];
    for (const duel of onSide) bySlot[duel.attacker] = (bySlot[duel.attacker] ?? 0) + 1;

    return bySlot;
  }, [onSide]);

  const items = useMemo((): readonly MapFeedItem[] => {
    const nameOf = (slot: PlayerSlot | null) =>
      players.find((player) => player.slot === slot)?.name ?? t('review.feed.unknownPlayer');

    return shown.flatMap((duel) => {
      const kill = demo.events.kills[duel.killIndex];
      if (kill === undefined) return [];

      const row = killRow(kill, duel.attackerSide, duel.victimSide);

      return {
        key: `kill-${duel.killIndex}`,
        roundNumber: duel.roundIndex + 1,
        event: { kind: 'kill', ...row },
        label: killName(row, nameOf, t),
      };
    });
  }, [shown, demo.events.kills, players, t]);

  // The duel itself rather than its index, so a narrowing that moves it keeps it chosen and one that
  // drops it lets it go.
  const [active, setActive] = useState<Duel | null>(null);
  const focused = active === null ? -1 : shown.indexOf(active);

  return (
    <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <PlayerTags
        players={players}
        chosen={narrowing.players}
        onChosen={(chosen) => onNarrowing({ ...narrowing, players: chosen })}
        figure={(slot) => counts[slot] ?? 0}
      />

      <div className="grid min-h-0 grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] gap-3">
        <aside
          aria-label={t('review.maps.controls')}
          className="surface-card flex min-h-0 min-w-0 flex-col gap-3 rounded-float p-3"
        >
          <SideRow side={narrowing.side} onSide={(side) => onNarrowing({ ...narrowing, side })} />

          <p className="numeric text-13 text-ink">
            <Text path="review.maps.duels" values={{ count: shown.length }} />
          </p>

          <MapFeedList
            label={t('review.maps.duelList')}
            items={items}
            players={players}
            focused={focused === -1 ? null : focused}
            onFocused={(index) => setActive(index === null ? null : (shown[index] ?? null))}
            press={{
              describe: t('review.maps.opensOnStage'),
              onPress: (index) => {
                const duel = shown[index];
                if (duel !== undefined) onOpenOnStage(stageFrameForDuel(demo, duel));
              },
            }}
          />

          <div aria-live="polite">
            <DuelCard
              detail={active === null ? undefined : duelDetail(demo, active)}
              players={players}
            />
          </div>

          <p className="text-12 text-ink-dim leading-prose">
            <Text path="review.maps.worldKillNote" />
          </p>
        </aside>

        <section className="grid min-h-0 min-w-0">
          <DuelPlate demo={demo} duels={shown} focused={focused === -1 ? null : focused} />
        </section>
      </div>
    </div>
  );
}
