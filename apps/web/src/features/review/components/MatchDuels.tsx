import {
  type Frame,
  headToHead,
  openingDuels,
  openingSideBySlot,
  opponentDuels,
  type ParsedDemo,
  type PlayerInfo,
  type PlayerSlot,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { useCallback, useMemo, useState } from 'react';
import { killName, killRow } from '@/core/events';
import { DuelPlate } from '@/features/radar';
import {
  type DuelMode,
  type DuelNarrowing,
  hasDuelFilter,
  isInDuelFilter,
  withMode,
  withoutFilter,
  withPair,
  withPlayer,
} from '../helpers/map-scope';
import { DuelGrid } from './DuelGrid';
import { DuelPanel } from './DuelPanel';
import { type MapFeedItem, MapFeedList } from './MapFeedList';
import { type ChoiceOption, SettingChoice } from './SettingChoice';

interface Props {
  demo: ParsedDemo;
  /**
   * Held by the match rather than by this screen (#387): opening a duel on the stage leaves this
   * screen, and coming back to it has to find the mode, the filter and the duel the reader left.
   */
  narrowing: DuelNarrowing;
  onNarrowing: (narrowing: DuelNarrowing) => void;
  onOpenOnStage: (frame: Frame) => void;
}

function playersOf(
  players: readonly PlayerInfo[],
  teams: readonly (string | undefined)[],
  team: string,
): readonly PlayerInfo[] {
  return players.filter((player) => teams[player.slot] === team);
}

/**
 * The match's duels, on the map they happened on — #386, and in its present shape #568.
 *
 * **It opens on the round-openers**, the duels that decided rounds, with every duel one press away.
 * The head-to-head grid is the filter (a name is a player, a cell a pair), the list is what is left,
 * and the panel beside the map says what the selection means. **A duel belongs to whoever made it**:
 * its line and its dot are the killer's side that round.
 *
 * **The side columns narrow below `wide`**: at 1024×800 the page is 1000px across, and the two
 * columns at their wide size left the plate 250px; narrowed they leave it 432px.
 *
 * **A duel chosen is that duel on the stage** (#387) through the panel's button, a few seconds
 * before the kill; hovering or focusing a row isolates it on the map and dims the rest.
 */
export function MatchDuels({ demo, narrowing, onNarrowing, onOpenOnStage }: Props) {
  const t = useT();
  const { players } = demo.header;
  const { mode, player, pair } = narrowing;

  // Derived once per match: these walk every round and every kill, and nothing on this screen is
  // on a readout, so a press on a control must not derive them again.
  const all = useMemo(() => opponentDuels(demo), [demo]);
  const openings = useMemo(() => openingDuels(demo), [demo]);
  const teams = useMemo(() => openingSideBySlot(demo), [demo]);

  const base = mode === 'openings' ? openings : all;
  const grid = useMemo(() => headToHead(base, demo.track.slotCount), [base, demo.track.slotCount]);
  const shown = useMemo(
    () => base.filter((duel) => isInDuelFilter({ player, pair }, duel)),
    [base, player, pair],
  );

  const rows = useMemo(() => playersOf(players, teams, 'ct'), [players, teams]);
  const columns = useMemo(() => playersOf(players, teams, 't'), [players, teams]);
  const isRow = (slot: PlayerSlot) => teams[slot] === 'ct';

  const nameOf = useCallback(
    (slot: PlayerSlot | null) =>
      players.find((each) => each.slot === slot)?.name ?? t('review.feed.unknownPlayer'),
    [players, t],
  );

  const items = useMemo((): readonly MapFeedItem[] => {
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
  }, [shown, demo.events.kills, nameOf, t]);

  // Index into `shown`. A pointer or the keyboard isolates a row while it is over it; the row chosen
  // stays isolated when it is not, which is what lets the reader look at the map.
  const [hovered, setHovered] = useState<number | null>(null);
  const chosen = shown.findIndex((duel) => duel.killIndex === narrowing.duel);
  const focused = hovered ?? (chosen === -1 ? null : chosen);

  const modeOptions: readonly ChoiceOption<DuelMode>[] = [
    {
      value: 'openings',
      label: (
        <>
          <Text path="review.duels.mode.openings" />
          <span className="numeric ml-1.5 text-ink-faint">{openings.length}</span>
        </>
      ),
    },
    {
      value: 'all',
      label: (
        <>
          <Text path="review.duels.mode.all" />
          <span className="numeric ml-1.5 text-ink-faint">{all.length}</span>
        </>
      ),
    },
  ];

  const listTitle = (() => {
    const count = shown.length;
    if (pair !== null) return t('review.duels.list.pair', { count });
    if (player !== null) {
      return t('review.duels.list.player', {
        name: nameOf(player),
        count,
      });
    }

    return t('review.duels.list.title', { count });
  })();

  return (
    <div className="grid min-h-0 grid-cols-[minmax(0,19rem)_minmax(0,1fr)_minmax(0,15rem)] gap-3 wide:grid-cols-[minmax(0,21rem)_minmax(0,1fr)_minmax(0,18.75rem)]">
      <aside
        aria-label={t('review.maps.controls')}
        className="surface-card flex min-h-0 min-w-0 flex-col gap-3.5 rounded-float p-3"
      >
        <div className="flex">
          <SettingChoice
            labelPath="review.duels.mode.label"
            value={mode}
            options={modeOptions}
            onChange={(next) => {
              setHovered(null);
              onNarrowing(withMode(narrowing, next));
            }}
          />
        </div>

        <DuelGrid
          rows={rows}
          columns={columns}
          rowSide="CT"
          columnSide="T"
          duels={grid}
          narrowing={narrowing}
          onPlayer={(slot) => onNarrowing(withPlayer(narrowing, slot))}
          onPair={(row, column) => onNarrowing(withPair(narrowing, row, column))}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <h2 className="numeric label-dense text-ink-dim">{listTitle}</h2>

            {hasDuelFilter(narrowing) && (
              <button
                type="button"
                onClick={() => onNarrowing(withoutFilter(narrowing))}
                className="rounded-chip text-12 text-ink-dim transition-colors duration-(--duration-micro) ease-out hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <Text path="review.duels.reset" />
              </button>
            )}
          </div>

          <MapFeedList
            label={t('review.maps.duelList')}
            items={items}
            players={players}
            focused={focused}
            onFocused={setHovered}
            press={{
              describe: t('review.duels.list.select'),
              onPress: (index) => {
                const duel = shown[index];
                if (duel === undefined) return;

                onNarrowing({
                  ...narrowing,
                  duel: duel.killIndex === narrowing.duel ? null : duel.killIndex,
                });
              },
            }}
          />
        </div>
      </aside>

      <section className="relative grid min-h-0 min-w-0">
        <DuelPlate demo={demo} duels={shown} focused={focused} />

        <p className="absolute bottom-2 left-2 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-x-3 gap-y-1 rounded-card bg-surface-0/80 px-2.5 py-1.5 text-12 text-ink-dim">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-ink" />
            <Text path="review.duels.legend.killer" />
          </span>
          <span className="flex items-center gap-1.5">
            <span className="numeric font-semibold text-ink">×</span>
            <Text path="review.duels.legend.victim" />
          </span>
          <span>
            <Text path="review.duels.legend.colour" />
          </span>
          <span>
            <Text path="review.maps.worldKillNote" />
          </span>
        </p>
      </section>

      <DuelPanel
        demo={demo}
        narrowing={narrowing}
        base={base}
        shown={shown}
        nameOf={nameOf}
        isRow={isRow}
        onNarrowing={onNarrowing}
        onOpenOnStage={onOpenOnStage}
      />
    </div>
  );
}
