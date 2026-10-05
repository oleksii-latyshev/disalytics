import {
  HEAT_BUYS,
  type HeatBuy,
  openingSideBySlot,
  type ParsedDemo,
  type PlayerInfo,
  type PlayerSlot,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { ArrowLeftRight } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';
import type { HeatReading, HeatSecond } from '../helpers/heat-view';
import type { SideScope } from '../helpers/map-scope';
import { HeatFigure } from './HeatFigure';
import { type ChoiceOption, SettingChoice } from './SettingChoice';

const LABEL = 'label-dense flex items-center gap-2 px-0.5 text-ink-dim';

const SEAT =
  'flex min-h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-chip px-2.5 text-left text-13 transition-colors duration-(--duration-micro) ease-out hover:text-ink';

const CHIP =
  'flex h-control cursor-pointer items-center rounded-chip border px-2.5 text-13 transition-colors duration-(--duration-micro) ease-out hover:text-ink';

interface Props {
  demo: ParsedDemo;
  reading: HeatReading;
  onReading: (reading: HeatReading) => void;
  subject: PlayerSlot | null;
  onSubject: (subject: PlayerSlot | null) => void;
  side: SideScope;
  onSide: (side: SideScope) => void;
  buy: HeatBuy | null;
  onBuy: (buy: HeatBuy | null) => void;
  /** Each seat's own figure under the filters, in seconds or in deaths, by slot. */
  figures: Float32Array;
  second: Pick<HeatSecond, 'name' | 'origin'> | null;
  onCompare: () => void;
  onRemoveSecond: () => void;
}

function Dot({ identity }: { identity: 'first' | 'second' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-2.5 shrink-0 rounded-full',
        identity === 'first' ? 'bg-heat-high' : 'bg-heat-second',
      )}
    />
  );
}

function seatClass(isChosen: boolean): string {
  return cn(SEAT, isChosen ? 'bg-selected font-semibold text-ink' : 'text-ink-dim');
}

function Seats({
  demo,
  reading,
  subject,
  onSubject,
  figures,
  isComparing,
}: Pick<Props, 'demo' | 'reading' | 'subject' | 'onSubject' | 'figures'> & {
  isComparing: boolean;
}) {
  const teams = useMemo(() => openingSideBySlot(demo), [demo]);
  const { players } = demo.header;

  const seat = (player: PlayerInfo) => (
    <li key={player.slot}>
      <button
        type="button"
        aria-pressed={subject === player.slot}
        onClick={() => onSubject(isComparing || subject !== player.slot ? player.slot : null)}
        className={seatClass(subject === player.slot)}
      >
        <span className="min-w-0 truncate">{player.name}</span>
        <span className="numeric shrink-0 text-12 font-normal text-ink-dim">
          <HeatFigure reading={reading} value={figures[player.slot] ?? 0} />
        </span>
      </button>
    </li>
  );

  return (
    <div className="flex flex-col gap-0.5">
      {!isComparing && (
        <button
          type="button"
          aria-pressed={subject === null}
          onClick={() => onSubject(null)}
          className={seatClass(subject === null)}
        >
          <Text path="review.maps.everyone" />
          <span className="numeric shrink-0 text-12 font-normal text-ink-dim">
            <HeatFigure
              reading={reading}
              value={players.reduce((sum, player) => sum + (figures[player.slot] ?? 0), 0)}
            />
          </span>
        </button>
      )}

      {(['ct', 't'] as const).map((team) => (
        <div key={team} className="flex flex-col gap-0.5">
          <h3 className="px-2.5 pt-2 pb-0.5 text-11 text-ink-dim">
            <Text path="review.heat.team" values={{ side: team === 'ct' ? 'CT' : 'T' }} />
          </h3>
          <ul className="flex list-none flex-col gap-0.5">
            {players.filter((player) => teams[player.slot] === team).map(seat)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function BuyChips({ buy, onBuy }: Pick<Props, 'buy' | 'onBuy'>) {
  const t = useT();
  const options: readonly { value: HeatBuy | null; label: ReactNode }[] = [
    { value: null, label: <Text path="review.heat.buy.all" /> },
    ...HEAT_BUYS.map((each) => ({ value: each, label: <Text path={`review.heat.buy.${each}`} /> })),
  ];

  return (
    <fieldset
      aria-label={t('review.heat.buy.label')}
      className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0"
    >
      {options.map((option) => (
        <button
          key={option.value ?? 'all'}
          type="button"
          aria-pressed={buy === option.value}
          onClick={() => onBuy(option.value)}
          className={cn(
            CHIP,
            buy === option.value
              ? 'border-ink bg-ink font-semibold text-surface-0 hover:text-surface-0'
              : 'border-line text-ink-dim',
          )}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

function CompareFoot({
  map,
  second,
  onCompare,
  onRemoveSecond,
}: {
  map: string;
  second: Pick<HeatSecond, 'name' | 'origin'> | null;
  onCompare: () => void;
  onRemoveSecond: () => void;
}) {
  if (second === null) {
    return (
      <button
        type="button"
        onClick={onCompare}
        className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-card border border-line-strong px-3 py-2 text-left transition-colors duration-(--duration-micro) ease-out hover:bg-hover"
      >
        <ArrowLeftRight aria-hidden="true" className="size-4 shrink-0 text-ink" />
        <span className="flex flex-col gap-px">
          <span className="font-semibold text-13 text-ink">
            <Text path="review.heat.compare.start" />
          </span>
          <span className="text-11 text-ink-dim">
            <Text path="review.heat.compare.startHint" values={{ map }} />
          </span>
        </span>
      </button>
    );
  }

  return (
    <>
      <h3 className={LABEL}>
        <Dot identity="second" />
        <Text path="review.heat.playerB" />
      </h3>
      <div className="flex items-center gap-2.5 rounded-card bg-surface-2 px-3 py-2.5">
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate font-semibold text-14 text-ink">{second.name}</span>
          <span className="text-11 text-ink-dim">
            <Text
              path={
                second.origin === 'this'
                  ? 'review.heat.compare.thisMatch'
                  : 'review.heat.compare.libraryMatch'
              }
              values={{ map }}
            />
          </span>
        </span>
        <button
          type="button"
          onClick={onCompare}
          className="h-7 shrink-0 cursor-pointer rounded-chip border border-line-strong px-2.5 text-12 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover"
        >
          <Text path="review.heat.compare.change" />
        </button>
      </div>
      <button
        type="button"
        onClick={onRemoveSecond}
        className="cursor-pointer self-start rounded-chip p-0.5 text-12 text-ink-dim underline underline-offset-3 transition-colors duration-(--duration-micro) ease-out hover:text-ink"
      >
        <Text path="review.heat.compare.remove" />
      </button>
    </>
  );
}

/**
 * The left column of the heat map, like the duels view's: what to show, whose, over which sides
 * and buys, and — at the foot — the second player to compare with.
 *
 * A seat's figure is the player's own under the side, the buy and the part of the round, and does
 * not move when a player is chosen: it is the reason for choosing them.
 */
export function HeatPanel(props: Props) {
  const t = useT();
  const { demo, reading, onReading, side, onSide, second } = props;
  const isComparing = second !== null;

  const readings: readonly ChoiceOption<HeatReading>[] = [
    { value: 'stood', label: <Text path="review.heat.read.stood" /> },
    { value: 'died', label: <Text path="review.heat.read.died" /> },
  ];
  const sides: readonly ChoiceOption<SideScope>[] = [
    { value: 'all', label: <Text path="review.maps.bothSides" /> },
    { value: 'CT', label: 'CT' },
    { value: 'T', label: 'T' },
  ];

  return (
    <aside
      aria-label={t('review.heat.panel')}
      className="surface-card flex min-h-0 min-w-0 flex-col gap-3.5 overflow-y-auto rounded-float p-3"
    >
      <SettingChoice
        labelPath="review.heat.panel"
        value={reading}
        options={readings}
        onChange={onReading}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <h2 className={LABEL}>
          {isComparing && <Dot identity="first" />}
          <Text path={isComparing ? 'review.heat.playerA' : 'review.heat.player'} />
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Seats
            demo={demo}
            reading={reading}
            subject={props.subject}
            onSubject={props.onSubject}
            figures={props.figures}
            isComparing={isComparing}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className={LABEL}>
          <Text path="review.maps.sides" />
        </h2>
        <SettingChoice
          labelPath="review.maps.sides"
          value={side}
          options={sides}
          onChange={onSide}
        />

        <h2 className={cn(LABEL, 'pt-1.5')}>
          <Text path="review.heat.buy.label" />
        </h2>
        <BuyChips buy={props.buy} onBuy={props.onBuy} />
      </div>

      <div className="flex flex-col gap-2 pt-3 [border-block-start:1px_solid_var(--color-line)]">
        <CompareFoot
          map={demo.header.map}
          second={second}
          onCompare={props.onCompare}
          onRemoveSecond={props.onRemoveSecond}
        />
      </div>
    </aside>
  );
}
