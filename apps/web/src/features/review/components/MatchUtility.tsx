import {
  type Frame,
  matchUtility,
  type ParsedDemo,
  type PlayerSlot,
  THROWN_UTILITY_KINDS,
  throwDetail,
  UTILITY_NAMES,
  type UtilityKind,
  type UtilityThrow,
  utilityKindOfGrenade,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@disa/ui';
import { useEffect, useMemo, useState } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { UtilityPlate } from '@/features/radar';
import { isInNarrowing, type MapNarrowing, WHOLE_MATCH } from '../helpers/map-scope';
import { groupThrowsByLanding, type ThrowCluster } from '../helpers/throw-cluster';
import { matchesTiming, type TimingScope, throwElapsedSeconds } from '../helpers/throw-timing';
import { ClusterThrowsModal } from './ClusterThrowsModal';
import { type MapFeedItem, MapFeedList } from './MapFeedList';
import { SideRow } from './MapScope';
import { PlayerTags } from './PlayerTags';
import { type ChoiceOption, SettingChoice } from './SettingChoice';
import { ThrowCard } from './ThrowCard';

/** `all` is not a kind, and it is first because the match is what a map screen opens on. */
type KindScope = 'all' | UtilityKind;

interface Props {
  demo: ParsedDemo;
  onOpenOnStage?: ((frame: Frame) => void) | undefined;
}

/** How many throws each slot has, indexed by slot, over whatever the scope above has left. */
function throwsBySlot(throws: readonly UtilityThrow[]): readonly number[] {
  const counts: number[] = [];

  for (const thrown of throws) {
    counts[thrown.grenade.thrower] = (counts[thrown.grenade.thrower] ?? 0) + 1;
  }

  return counts;
}

/**
 * The match's utility, on the map it was thrown across, with every throw as a row beside it — #386.
 *
 * **A throw belongs to whoever threw it**, which is why the side and the tags read the thrower, the
 * way the duel map's read the attacker.
 *
 * **The kind is a narrowing this screen needs where the duel map needs none.** A match's utility is
 * three to four times its duels — 526 grenades over 24 rounds on the dust2 sample against 144 kills
 * — so "where do our smokes land" is a question the reader cannot ask by looking.
 *
 * **Its narrowing is this screen's own.** The duel map's is held by the match because a duel can be
 * opened on the stage; a throw cannot yet, so nothing here leaves the screen for it to be kept.
 */
export function MatchUtility({ demo, onOpenOnStage }: Props) {
  const t = useT();
  const { players } = demo.header;

  const [narrowing, setNarrowing] = useState<MapNarrowing>(WHOLE_MATCH);
  const [kind, setKind] = useState<KindScope>('all');
  const [roundScope, setRoundScope] = useState<string>('all');
  const [timing, setTiming] = useState<TimingScope>('all');
  const [clusterModal, setClusterModal] = useState<ThrowCluster | null>(null);

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

  const onRound = useMemo(
    () =>
      roundScope === 'all'
        ? onKind
        : onKind.filter((thrown) => thrown.roundIndex === Number(roundScope)),
    [onKind, roundScope],
  );

  const onTiming = useMemo(
    () =>
      timing === 'all'
        ? onRound
        : onRound.filter((thrown) => {
            const round = demo.events.rounds[thrown.roundIndex];
            if (round === undefined) return false;
            return matchesTiming(timing, throwElapsedSeconds(thrown, round, demo.track.tickRate));
          }),
    [onRound, timing, demo.events.rounds, demo.track.tickRate],
  );

  const onSide = useMemo(
    () =>
      narrowing.side === 'all'
        ? onTiming
        : onTiming.filter((thrown) => thrown.throwerSide === narrowing.side),
    [onTiming, narrowing.side],
  );

  const shown = useMemo(
    () =>
      onTiming.filter((thrown) =>
        isInNarrowing(narrowing, thrown.throwerSide, thrown.grenade.thrower),
      ),
    [onTiming, narrowing],
  );

  const clusters = useMemo(() => groupThrowsByLanding(shown), [shown]);

  // Counted over the side's throws rather than the tags', so a tag says what that player threw
  // whether or not it is on.
  const counts = useMemo(() => throwsBySlot(onSide), [onSide]);

  const items = useMemo((): readonly MapFeedItem[] => {
    const nameOf = (slot: PlayerSlot) =>
      players.find((player) => player.slot === slot)?.name ?? t('review.feed.unknownPlayer');

    return shown.map((thrown) => {
      const utility = utilityKindOfGrenade(thrown.grenade.type);

      return {
        key: `nade-${thrown.grenade.throwTick}-${thrown.grenade.thrower}`,
        roundNumber: thrown.roundIndex + 1,
        event: {
          kind: 'grenade',
          thrower: thrown.grenade.thrower,
          throwerSide: thrown.throwerSide,
          utility,
        },
        // Game vocabulary reaches a label untranslated, the way a kill's weapon does.
        label: t('events.grenade', {
          thrower: nameOf(thrown.grenade.thrower),
          utility: UTILITY_NAMES[utility],
        }),
      };
    });
  }, [shown, players, t]);

  const [selected, setSelected] = useState<UtilityThrow | null>(null);
  const [hovered, setHovered] = useState<UtilityThrow | null>(null);

  useEffect(() => {
    if (selected !== null && !shown.includes(selected)) {
      setSelected(null);
    }
  }, [shown, selected]);

  const active = hovered ?? selected;
  const focused = active === null ? -1 : shown.indexOf(active);

  // A grenade's name is game vocabulary and stays as `UTILITY_NAMES` gives it; only the word for
  // *all* of them is a string. The glyph is the same mark a team row and the round axis draw.
  const kindOptions: readonly ChoiceOption<KindScope>[] = [
    { value: 'all', label: <Text path="review.maps.everyKind" /> },
    ...THROWN_UTILITY_KINDS.map((thrown) => ({
      value: thrown,
      label: <UtilityGlyph kind={thrown} label={UTILITY_NAMES[thrown]} size="control" />,
    })),
  ];

  const timingOptions: readonly ChoiceOption<TimingScope>[] = [
    { value: 'all', label: <Text path="review.maps.timing.all" /> },
    { value: 'early', label: <Text path="review.maps.timing.early" /> },
    { value: 'mid', label: <Text path="review.maps.timing.mid" /> },
    { value: 'late', label: <Text path="review.maps.timing.late" /> },
  ];

  return (
    <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
      <PlayerTags
        players={players}
        chosen={narrowing.players}
        onChosen={(chosen) => setNarrowing({ ...narrowing, players: chosen })}
        figure={(slot) => counts[slot] ?? 0}
      />

      <div className="grid min-h-0 grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] gap-3">
        <aside
          aria-label={t('review.maps.controls')}
          className="surface-card flex min-h-0 min-w-0 flex-col gap-3 rounded-float p-3 overflow-y-auto"
        >
          <SideRow side={narrowing.side} onSide={(side) => setNarrowing({ ...narrowing, side })} />

          <div className="flex items-center justify-between gap-2">
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

          <div className="flex items-center justify-between gap-2">
            <h2 className="label-dense text-ink-dim">
              <Text path="review.maps.round" />
            </h2>

            <Select
              value={roundScope}
              onValueChange={(val) => {
                if (val !== null) setRoundScope(val);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue>
                  {roundScope === 'all' ? (
                    <Text path="review.maps.allRounds" />
                  ) : (
                    <Text
                      path="review.maps.roundNumber"
                      values={{
                        round:
                          demo.events.rounds[Number(roundScope)]?.number ?? Number(roundScope) + 1,
                      }}
                    />
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <Text path="review.maps.allRounds" />
                </SelectItem>
                {demo.events.rounds.map((round, idx) => (
                  <SelectItem key={round.number} value={String(idx)}>
                    <Text path="review.maps.roundNumber" values={{ round: round.number }} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <h2 className="label-dense text-ink-dim">
              <Text path="review.maps.timing.label" />
            </h2>

            <SettingChoice
              labelPath="review.maps.timing.label"
              value={timing}
              options={timingOptions}
              onChange={setTiming}
            />
          </div>

          <p className="numeric text-13 text-ink">
            <Text path="review.maps.throws" values={{ count: shown.length }} />
          </p>

          <MapFeedList
            label={t('review.maps.throwList')}
            items={items}
            players={players}
            focused={focused === -1 ? null : focused}
            onFocused={(index) => setHovered(index === null ? null : (shown[index] ?? null))}
            press={{
              describe: t('review.maps.throw.select'),
              onPress: (index) => {
                const item = shown[index] ?? null;
                setSelected((prev) => (prev === item ? null : item));
              },
            }}
          />

          <div aria-live="polite">
            <ThrowCard
              detail={active === null ? undefined : throwDetail(demo, active)}
              players={players}
              map={demo.header.map}
            />
          </div>

          <p className="text-12 text-ink-dim leading-prose">
            <Text path="review.maps.lineupNote" values={{ hz: demo.track.sampleHz }} />
          </p>
        </aside>

        <section className="grid min-h-0 min-w-0">
          <UtilityPlate
            demo={demo}
            throws={shown}
            clusters={clusters}
            focused={focused === -1 ? null : focused}
            onSelect={(index) => setSelected(index === null ? null : (shown[index] ?? null))}
            onSelectCluster={(cluster) => setClusterModal(cluster)}
          />
        </section>
      </div>

      <ClusterThrowsModal
        isOpen={clusterModal !== null}
        cluster={clusterModal}
        throws={shown}
        demo={demo}
        onDismiss={() => setClusterModal(null)}
        onOpenOnStage={onOpenOnStage ?? (() => {})}
      />
    </div>
  );
}
