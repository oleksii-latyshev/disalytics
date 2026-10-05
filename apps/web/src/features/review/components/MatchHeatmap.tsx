import {
  type HeatBuy,
  type HeatPhaseId,
  type ParsedDemo,
  type PlayerSlot,
  presenceByRoundTime,
} from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview } from '@disa/map-data';
import { useMemo, useState } from 'react';
import { filterSummary, heatLegendKind, heatTitle } from '../helpers/heat-copy';
import {
  pickBin,
  playRange,
  type RoundRange,
  rangeOfPhase,
  WHOLE_RANGE,
} from '../helpers/heat-range';
import type { HeatCompareView, HeatReading, HeatSecond } from '../helpers/heat-view';
import type { SideScope } from '../helpers/map-scope';
import { useHeatView } from '../hooks/use-heat-view';
import { useRoundPlay } from '../hooks/use-round-play';
import { HeatCompareDialog } from './HeatCompareDialog';
import { HeatReadout } from './HeatFigure';
import { HeatHeader } from './HeatHeader';
import { HeatPanel } from './HeatPanel';
import { HeatPlates } from './HeatPlates';
import { HeatRoundTime } from './HeatRoundTime';

const NO_FIGURES = new Float32Array(0);

/**
 * Where the match was spent, and where it ended — and, since #569, how one player's ground compares
 * with another's, from this match or from another one of the library.
 *
 * **Which marks count is `demo-core`'s** (`walkHeat` and the points kept of a player): this screen
 * chooses the reading, the player, the side, the buy and the part of the round, and builds what the
 * plates draw when one of them changes. Nothing is built in a draw, and nothing here has a clock:
 * *Play round* is a timer that moves the part of the round, which stops when the view does.
 *
 * **A seat's figure ignores the player narrowing**, so choosing a player changes what is drawn
 * without moving the numbers that were the reason for choosing them.
 *
 * Nothing is remembered: a map screen is its reading, and leaving it ends the comparison with the
 * match that was dropped for it.
 */
export function MatchHeatmap({ demo, demoKey }: { demo: ParsedDemo; demoKey: string }) {
  const t = useT();
  const { players } = demo.header;

  const [reading, setReading] = useState<HeatReading>('stood');
  const [side, setSide] = useState<SideScope>('all');
  const [buy, setBuy] = useState<HeatBuy | null>(null);
  const [range, setRange] = useState<RoundRange>(WHOLE_RANGE);
  const [subject, setSubject] = useState<PlayerSlot | null>(null);
  const [second, setSecond] = useState<HeatSecond | null>(null);
  const [compareView, setCompareView] = useState<HeatCompareView>('side');
  const [isPicking, setIsPicking] = useState(false);
  const play = useRoundPlay();

  const shownRange = play.step === null ? range : playRange(play.step);
  const overview = getMapOverview(demo.header.map);
  const sideScope = side === 'all' ? null : side;
  const secondPoints = second?.points ?? null;

  const heat = useHeatView({
    demo,
    overview,
    reading,
    scope: { side: sideScope, subject, buy },
    range,
    step: play.step,
    secondPoints,
    view: compareView,
  });

  const bars = useMemo(
    () => presenceByRoundTime(demo, { side: sideScope, subject, buy }),
    [demo, sideScope, subject, buy],
  );

  const nameOf = (slot: PlayerSlot | null) =>
    players.find((player) => player.slot === slot)?.name ?? t('review.maps.everyone');
  const names = { first: nameOf(subject), second: second?.name ?? '' };

  const isComparing = second !== null;
  const secondCard = useMemo(
    () => (second === null ? null : { name: second.name, origin: second.origin }),
    [second],
  );
  const isDifference = isComparing && compareView === 'difference';

  const handleRange = (next: RoundRange) => {
    play.stop();
    setRange(next);
  };

  const handleCompare = () => {
    if (subject === null) setSubject(players[0]?.slot ?? null);
    setIsPicking(true);
  };

  const compare = isComparing ? compareView : null;

  return (
    <div className="grid min-h-0 grid-cols-[minmax(0,19rem)_minmax(0,1fr)] gap-3 wide:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
      <HeatPanel
        demo={demo}
        reading={reading}
        onReading={setReading}
        subject={subject}
        onSubject={setSubject}
        side={side}
        onSide={setSide}
        buy={buy}
        onBuy={setBuy}
        figures={heat?.roster.bySlot ?? NO_FIGURES}
        second={secondCard}
        onCompare={handleCompare}
        onRemoveSecond={() => {
          setSecond(null);
          setCompareView('side');
        }}
      />

      <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-2.5">
        <HeatHeader
          title={heatTitle(t, reading, compare, names)}
          subtitle={filterSummary(t, { side, buy, range: shownRange })}
          figure={
            <HeatReadout
              reading={reading}
              isComparing={isComparing}
              total={heat?.plates[0]?.total ?? 0}
              overlap={heat?.overlap ?? null}
            />
          }
          view={isComparing ? compareView : null}
          onView={setCompareView}
        />

        <HeatPlates
          demo={demo}
          plates={heat?.plates ?? [{ picture: null, identity: 'field', total: 0 }]}
          reading={reading}
          labels={isComparing && !isDifference ? [names.first, names.second] : [null]}
          legend={heatLegendKind(reading, compare)}
          names={names}
        />

        <HeatRoundTime
          range={shownRange}
          bars={bars}
          isPlaying={play.step !== null}
          onWhole={() => handleRange(WHOLE_RANGE)}
          onPhase={(phase: HeatPhaseId) => handleRange(rangeOfPhase(phase))}
          onBin={(bin) => handleRange(pickBin(range, bin))}
          onPlay={() => {
            setRange(WHOLE_RANGE);
            play.start();
          }}
          onStop={play.stop}
        />
      </div>

      {isPicking && (
        <HeatCompareDialog
          demo={demo}
          demoKey={demoKey}
          first={subject}
          onDismiss={() => setIsPicking(false)}
          onConfirm={(chosen) => {
            setSecond(chosen);
            setCompareView('side');
            setIsPicking(false);
          }}
        />
      )}
    </div>
  );
}
