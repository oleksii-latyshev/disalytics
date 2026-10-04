import {
  asFrame,
  frameForTick,
  type Kill,
  killWeaponName,
  type ParsedDemo,
  roundOpeningFrame,
  roundWinners,
  sidesBySlotAtRound,
  tickAtFrame,
} from '@disa/demo-core';
import type { SavedDemo } from '@disa/demo-store';
import { Text } from '@disa/i18n';
import { Play } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { SAMPLE_MATCHES } from '@/core/samples';
import { PlateStill } from '@/features/radar';
import { momentsOf } from '../../helpers/home-moments';
import { mapTitle } from '../../helpers/map-title';
import { useLessMotion } from '../../hooks/use-less-motion';
import { RoundPreview } from '../RoundPreview';
import { PickDemoButton } from './PickDemoButton';
import { RoundStrip } from './RoundStrip';
import type { WidgetProps } from './types';

const REPLAY_RATE = 3;
const REPLAY_HOLD_SECONDS = 2;
const FEED_LENGTH = 3;
const STILL_SECONDS_BEFORE_END = 4;

const PRIMARY =
  'inline-flex h-10 items-center gap-2 rounded-card bg-ink px-4 text-13 font-medium text-surface-0 transition-colors hover:bg-ink-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const SECONDARY =
  'inline-flex h-10 items-center gap-2 rounded-card border border-line-strong px-4 text-13 font-medium text-ink transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

const SHELL = 'absolute inset-0 flex flex-col-reverse md:flex-row';
const COPY =
  'flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-3 overflow-hidden p-[18px] md:p-7';
const PLATE =
  'relative flex aspect-square w-full flex-none items-center justify-center overflow-hidden bg-surface-0 md:h-full md:w-auto md:max-w-[50%]';

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));

  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function Eyebrow({ path }: { path: 'library.home.hero.continue' | 'library.home.hero.sample' }) {
  return (
    <p className="label-dense text-ink-dim">
      <Text path={path} />
    </p>
  );
}

interface FeedProps {
  demo: ParsedDemo;
  roundIndex: number;
  shown: number;
  kills: readonly Kill[];
}

function KillFeed({ demo, roundIndex, shown, kills }: FeedProps) {
  const sides = useMemo(() => sidesBySlotAtRound(demo, roundIndex), [demo, roundIndex]);
  const nameOf = (slot: number | null) =>
    slot === null ? '—' : (demo.header.players.find((player) => player.slot === slot)?.name ?? '—');
  const tone = (slot: number | null) =>
    slot === null ? 'text-ink-dim' : sides[slot] === 'CT' ? 'text-ct' : 'text-t';

  return (
    <ol className="m-0 flex list-none flex-col gap-0.5 p-0 font-mono text-11" aria-hidden="true">
      {kills.slice(Math.max(0, shown - FEED_LENGTH), shown).map((kill) => (
        <li
          key={kill.tick}
          className="flex min-w-0 items-baseline gap-1.5 rounded-chip bg-surface-0/80 px-1.5 py-0.5"
        >
          <span className={`truncate ${tone(kill.attacker)}`}>{nameOf(kill.attacker)}</span>
          <span className="shrink-0 text-ink-dim">
            {killWeaponName(kill.weapon)}
            {kill.isHeadshot ? ' · HS' : ''}
          </span>
          <span className={`truncate ${tone(kill.victim)}`}>{nameOf(kill.victim)}</span>
        </li>
      ))}
    </ol>
  );
}

function Replay({
  demo,
  roundIndex,
  showsFeed,
}: {
  demo: ParsedDemo;
  roundIndex: number;
  showsFeed: boolean;
}) {
  const isLess = useLessMotion();
  const clockRef = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const round = demo.events.rounds[roundIndex];
  const { track } = demo;

  const span = useMemo(() => {
    if (round === undefined) return null;
    const from = roundOpeningFrame(demo, roundIndex);
    const to = frameForTick(track, round.endTick);
    const rest = asFrame(Math.max(from, to - STILL_SECONDS_BEFORE_END * track.sampleHz));

    return { from, to, rest, startTick: round.freezeTimeEndTick };
  }, [demo, round, roundIndex, track]);

  const kills = useMemo(
    () =>
      round === undefined
        ? []
        : demo.events.kills.filter(
            (kill) => kill.tick >= round.startTick && kill.tick <= round.endTick,
          ),
    [demo, round],
  );

  const sample = useCallback(
    (frame: number) => {
      if (span === null) return;
      const tick = tickAtFrame(track, frame);
      setShown(kills.filter((kill) => kill.tick <= tick).length);
      if (clockRef.current !== null) {
        clockRef.current.textContent = clock((tick - span.startTick) / track.tickRate);
      }
    },
    [kills, span, track],
  );

  const replay = useMemo(
    () =>
      span === null
        ? undefined
        : {
            from: span.from,
            to: span.to,
            rate: REPLAY_RATE,
            holdSeconds: REPLAY_HOLD_SECONDS,
            isPlaying: !isLess,
            onSample: sample,
          },
    [isLess, sample, span],
  );

  if (span === null) return null;

  const feedShown = isLess ? kills.length : shown;

  return (
    <>
      <div className="size-full">
        <PlateStill demo={demo} frame={span.rest} replay={replay} />
      </div>
      <div className="pointer-events-none absolute inset-x-2 bottom-2 flex flex-col gap-1.5">
        {showsFeed && (
          <KillFeed demo={demo} roundIndex={roundIndex} shown={feedShown} kills={kills} />
        )}
        {!isLess && (
          <p className="w-fit rounded-chip bg-surface-0/80 px-1.5 py-0.5 font-mono text-11 text-ink-dim">
            <Text path="library.preview.round" values={{ round: roundIndex + 1 }} />
            {' · '}
            <span ref={clockRef} className="numeric text-ink">
              0:00
            </span>
          </p>
        )}
      </div>
    </>
  );
}

function ContinueHero({ size, data, actions, last }: WidgetProps & { last: SavedDemo }) {
  const { lastDemo, reading } = data;

  const isReading = reading !== null && reading.key === last.key;
  const roundIndex = Math.min(
    Math.max((isReading ? reading.round : 1) - 1, 0),
    last.roundCount - 1,
  );
  const sample = SAMPLE_MATCHES.find((match) => last.key.startsWith(`sample:${match.id}:`));
  const winners = useMemo(
    () => last.winners ?? (lastDemo === null ? null : roundWinners(lastDemo)),
    [last.winners, lastDemo],
  );
  const moments = useMemo(() => (lastDemo === null ? [] : momentsOf(lastDemo)), [lastDemo]);
  const isTall = size === 'XL';
  const nameOf = (slot: number) =>
    lastDemo?.header.players.find((player) => player.slot === slot)?.name ?? '';

  return (
    <div className={SHELL}>
      <div className={COPY}>
        <div className="flex min-h-0 flex-col gap-3 md:gap-4">
          <Eyebrow path="library.home.hero.continue" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p
              className={`font-ui font-medium leading-dense ${isTall ? 'text-28 md:text-44' : 'text-28'}`}
            >
              {mapTitle(last.map)}
            </p>
            <p className="truncate text-14 font-medium">
              {sample === undefined ? (
                last.fileName
              ) : (
                <Text
                  path="library.samples.teams"
                  values={{ home: sample.teams[0], away: sample.teams[1] }}
                />
              )}
            </p>
            {isTall && (
              <p className="numeric truncate text-12 text-ink-dim">
                <Text path="library.saved.score" values={{ ...last.score }} />
                {' · '}
                <Text path="library.saved.rounds" values={{ count: last.roundCount }} />
              </p>
            )}
          </div>
          {isReading && (
            <p className="numeric text-12 text-ink-dim">
              <Text
                path="library.home.hero.stopped"
                values={{ round: roundIndex + 1, total: last.roundCount }}
              />
            </p>
          )}
          {winners !== null && (
            <RoundStrip winners={winners} current={isReading ? roundIndex : -1} />
          )}
          {isTall && moments.length > 0 && (
            <div className="hidden min-h-0 flex-col gap-1.5 md:flex">
              <p className="label-dense text-ink-dim">
                <Text path="library.home.hero.moments" />
              </p>
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {moments.slice(0, 3).map((moment) => (
                  <li key={`${moment.roundIndex}:${moment.slot}`}>
                    <button
                      type="button"
                      onClick={() => actions.onEnter(last, moment.roundIndex)}
                      className="flex w-full items-center gap-2 rounded-chip px-1.5 py-1 text-left text-12 hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <span className="numeric w-8 shrink-0 font-mono text-ink-dim">
                        <Text
                          path="library.home.hero.momentRound"
                          values={{ round: moment.roundIndex + 1 }}
                        />
                      </span>
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-full ${moment.side === 'CT' ? 'bg-ct' : 'bg-t'}`}
                      />
                      <span className="truncate">
                        <Text
                          path={
                            moment.kind === 'clutch'
                              ? 'library.home.hero.momentClutch'
                              : 'library.home.hero.momentMulti'
                          }
                          values={{ player: nameOf(moment.slot), count: moment.count }}
                        />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {moments.length > 3 && (
                <p className="px-1.5 text-11 text-ink-faint">
                  <Text
                    path="library.home.hero.momentsMore"
                    values={{ count: moments.length - 3 }}
                  />
                </p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <button
            type="button"
            onClick={() => actions.onEnter(last, roundIndex)}
            className={PRIMARY}
          >
            <Play aria-hidden="true" className="size-4" />
            <Text
              path={isReading ? 'library.home.hero.resume' : 'library.home.hero.review'}
              values={{ round: roundIndex + 1 }}
            />
          </button>
          {isReading && isTall && (
            <p className="text-11 text-ink-dim">
              <Text path="library.home.hero.readAt" values={{ when: new Date(reading.at) }} />
            </p>
          )}
        </div>
      </div>
      <div className={PLATE}>
        {lastDemo === null ? null : (
          <Replay
            showsFeed={isTall}
            key={`${last.key}:${roundIndex}`}
            demo={lastDemo}
            roundIndex={roundIndex}
          />
        )}
      </div>
    </div>
  );
}

function FirstRunHero({ actions }: Pick<WidgetProps, 'actions'>) {
  const sample = SAMPLE_MATCHES.find((match) => match.map === 'de_dust2') ?? SAMPLE_MATCHES[0];

  return (
    <div className={SHELL}>
      <div className={COPY}>
        <div className="flex min-w-0 flex-col gap-3 md:gap-4">
          <Eyebrow path="library.home.hero.sample" />
          {sample !== undefined && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="font-ui text-28 font-medium leading-dense md:text-44">
                {mapTitle(sample.map)}
              </p>
              <p className="truncate text-14 font-medium">
                <Text
                  path="library.samples.teams"
                  values={{ home: sample.teams[0], away: sample.teams[1] }}
                />
              </p>
              <p className="truncate text-12 text-ink-dim">{sample.event}</p>
            </div>
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap gap-2">
            <PickDemoButton onFile={actions.onFile} className={PRIMARY}>
              <Play aria-hidden="true" className="size-4" />
              <Text path="library.home.hero.openYours" />
            </PickDemoButton>
            {sample !== undefined && (
              <button type="button" onClick={() => actions.onSample(sample)} className={SECONDARY}>
                <Text path="library.home.hero.reviewSample" />
              </button>
            )}
          </div>
          <p className="text-11 text-ink-dim leading-prose">
            <Text path="library.home.hero.formats" />
          </p>
        </div>
      </div>
      <div className={PLATE}>
        <RoundPreview suspended={false} compact />
      </div>
    </div>
  );
}

export function HeroWidget(props: WidgetProps) {
  const { last } = props.data;

  return last === null ? (
    <FirstRunHero actions={props.actions} />
  ) : (
    <ContinueHero {...props} last={last} />
  );
}
