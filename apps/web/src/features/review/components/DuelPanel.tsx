import {
  type Counted,
  type Duel,
  duelWeapons,
  type Frame,
  type Kill,
  openingReading,
  openingSideBySlot,
  type ParsedDemo,
  type PlayerSlot,
  playerDuels,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { type ReactNode, useMemo } from 'react';
import { KillMark } from '@/core/glyphs';
import { type DuelNarrowing, stageFrameForDuel, withPair, withPlayer } from '../helpers/map-scope';

interface Props {
  demo: ParsedDemo;
  narrowing: DuelNarrowing;
  /** The duels of the mode, before the filter. */
  base: readonly Duel[];
  /** The duels the filter left. */
  shown: readonly Duel[];
  /** The slot's name, or the unknown player's. */
  nameOf: (slot: PlayerSlot) => string;
  /** Whether a slot is on the team shown down the grid's side, which is what orders a pair. */
  isRow: (slot: PlayerSlot) => boolean;
  onNarrowing: (narrowing: DuelNarrowing) => void;
  onOpenOnStage: (frame: Frame) => void;
}

interface Fact {
  readonly key: string;
  readonly value: ReactNode;
  readonly label: ReactNode;
}

interface Row {
  readonly key: string | number;
  readonly label: string;
  readonly count: ReactNode;
  readonly onPick?: (() => void) | undefined;
}

/** How many names or weapons a list keeps: enough to read who it was, few enough to stay a glance. */
const TOP = 4;

const ROW_CLASS =
  'flex min-h-9 w-full items-center justify-between gap-2 rounded-chip border border-line-soft px-2.5 text-13 text-ink';

function Group({ title, rows }: { title: ReactNode; rows: readonly Row[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <h3 className="label-dense text-ink-dim">{title}</h3>

      <ul className="flex list-none flex-col gap-0.5 p-0">
        {rows.map((row) => {
          const body = (
            <>
              <span className="min-w-0 truncate">{row.label}</span>
              <span className="numeric shrink-0 text-ink-dim">{row.count}</span>
            </>
          );

          return (
            <li key={row.key}>
              {row.onPick === undefined ? (
                <span className={ROW_CLASS}>{body}</span>
              ) : (
                <button
                  type="button"
                  onClick={row.onPick}
                  className={`${ROW_CLASS} transition-colors duration-(--duration-micro) ease-out hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus`}
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** What every reading of the panel is made of: a heading, figures, lists, and maybe one button. */
function Layout({
  kind,
  title,
  text,
  facts,
  children,
}: {
  kind: ReactNode;
  title: ReactNode;
  text: ReactNode;
  facts?: readonly Fact[];
  children?: ReactNode;
}) {
  const t = useT();

  return (
    <section
      aria-label={t('review.duels.panel.label')}
      className="surface-card flex min-h-0 min-w-0 flex-col gap-3.5 overflow-y-auto rounded-float p-4"
    >
      <div className="flex flex-col gap-1">
        <p className="text-12 text-ink-dim">{kind}</p>
        <h2 className="numeric font-semibold text-18 leading-snug">{title}</h2>
        <div className="text-13 text-ink-dim leading-prose">{text}</div>
      </div>

      {facts !== undefined && facts.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {facts.map((fact) => (
            <div
              key={fact.key}
              className="flex min-w-0 flex-col gap-0.5 rounded-card bg-surface-2 px-3 py-2.5"
            >
              <span className="numeric font-semibold text-18 text-ink">{fact.value}</span>
              <span className="text-12 text-ink-dim">{fact.label}</span>
            </div>
          ))}
        </div>
      )}

      {children}
    </section>
  );
}

function useTimes() {
  const t = useT();

  return (count: number) => t('review.duels.panel.times', { count });
}

/** Game vocabulary, untranslated: the display names `killWeaponName` reads through #53's table. */
function WeaponGroup({
  title,
  duels,
  kills,
}: {
  title: ReactNode;
  duels: readonly Duel[];
  kills: readonly Kill[];
}) {
  const times = useTimes();

  return (
    <Group
      title={title}
      rows={duelWeapons(duels, kills)
        .slice(0, TOP)
        .map(({ value, count }) => ({ key: value, label: value, count: times(count) }))}
    />
  );
}

function Ranked({
  title,
  counted,
  nameOf,
  pick,
}: {
  title: ReactNode;
  counted: readonly Counted<PlayerSlot>[];
  nameOf: (slot: PlayerSlot) => string;
  pick: (slot: PlayerSlot) => () => void;
}) {
  const times = useTimes();

  return (
    <Group
      title={title}
      rows={counted.slice(0, TOP).map(({ value, count }) => ({
        key: value,
        label: nameOf(value),
        count: times(count),
        onPick: pick(value),
      }))}
    />
  );
}

function Overview({
  demo,
  narrowing,
  base,
  nameOf,
  onNarrowing,
}: Pick<Props, 'demo' | 'narrowing' | 'base' | 'nameOf' | 'onNarrowing'>) {
  const reading = useMemo(() => openingReading(demo, base), [demo, base]);
  const isOpenings = narrowing.mode === 'openings';
  const pick = (slot: PlayerSlot) => () => onNarrowing(withPlayer(narrowing, slot));

  return (
    <Layout
      kind={
        <Text
          path={
            isOpenings ? 'review.duels.panel.overview.openings' : 'review.duels.panel.overview.all'
          }
        />
      }
      title={
        <>
          <Text path="review.duels.panel.overview.team" values={{ side: 'CT' }} />{' '}
          {reading.byTeam.ct} : {reading.byTeam.t}{' '}
          <Text path="review.duels.panel.overview.team" values={{ side: 'T' }} />
        </>
      }
      text={
        <Text
          path={
            isOpenings
              ? 'review.duels.panel.overview.openingsText'
              : 'review.duels.panel.overview.allText'
          }
        />
      }
    >
      <Ranked
        title={
          <Text
            path={
              isOpenings
                ? 'review.duels.panel.overview.topOpeners'
                : 'review.duels.panel.overview.topKills'
            }
          />
        }
        counted={reading.openers}
        nameOf={nameOf}
        pick={pick}
      />
      <Ranked
        title={
          <Text
            path={
              isOpenings
                ? 'review.duels.panel.overview.topFirstDeaths'
                : 'review.duels.panel.overview.topDeaths'
            }
          />
        }
        counted={reading.firstDeaths}
        nameOf={nameOf}
        pick={pick}
      />
    </Layout>
  );
}

function PlayerReading({
  demo,
  slot,
  narrowing,
  base,
  nameOf,
  isRow,
  onNarrowing,
}: Pick<Props, 'demo' | 'narrowing' | 'base' | 'nameOf' | 'isRow' | 'onNarrowing'> & {
  slot: PlayerSlot;
}) {
  const t = useT();
  const teams = useMemo(() => openingSideBySlot(demo), [demo]);
  const reading = useMemo(() => playerDuels(base, slot), [base, slot]);
  const made = useMemo(() => base.filter((duel) => duel.attacker === slot), [base, slot]);
  const total = reading.kills + reading.deaths;

  const pickPair = (other: PlayerSlot) => () =>
    onNarrowing(isRow(slot) ? withPair(narrowing, slot, other) : withPair(narrowing, other, slot));

  return (
    <Layout
      kind={
        <Text
          path={
            narrowing.mode === 'openings'
              ? 'review.duels.panel.player.kindOpenings'
              : 'review.duels.panel.player.kindAll'
          }
          values={{ side: teams[slot]?.toUpperCase() ?? '' }}
        />
      }
      title={nameOf(slot)}
      text={<Text path="review.duels.panel.player.text" />}
      facts={[
        { key: 'kills', value: reading.kills, label: t('review.duels.panel.player.kills') },
        { key: 'deaths', value: reading.deaths, label: t('review.duels.panel.player.deaths') },
        {
          key: 'bySide',
          value: `${reading.killsAsCt} / ${reading.killsAsT}`,
          label: t('review.duels.panel.player.killsBySide'),
        },
        {
          key: 'share',
          value: total === 0 ? '—' : `${Math.round((reading.kills / total) * 100)}%`,
          label: t('review.duels.panel.player.won'),
        },
      ]}
    >
      <Ranked
        title={<Text path="review.duels.panel.player.mostKilled" />}
        counted={reading.killed}
        nameOf={nameOf}
        pick={pickPair}
      />
      <Ranked
        title={<Text path="review.duels.panel.player.diedTo" />}
        counted={reading.diedTo}
        nameOf={nameOf}
        pick={pickPair}
      />
      <WeaponGroup
        title={<Text path="review.duels.panel.player.weapons" />}
        duels={made}
        kills={demo.events.kills}
      />
    </Layout>
  );
}

function PairReading({
  demo,
  pair,
  shown,
  nameOf,
}: Pick<Props, 'demo' | 'shown' | 'nameOf'> & { pair: readonly [PlayerSlot, PlayerSlot] }) {
  const t = useT();
  const [row, column] = pair;
  const won = shown.filter((duel) => duel.attacker === row).length;
  const lost = shown.length - won;
  const leader = won > lost ? row : column;

  return (
    <Layout
      kind={<Text path="review.duels.panel.pair.kind" />}
      title={`${nameOf(row)} ${won} : ${lost} ${nameOf(column)}`}
      text={
        won === lost ? (
          <Text path="review.duels.panel.pair.even" />
        ) : (
          <Text path="review.duels.panel.pair.leader" values={{ name: nameOf(leader) }} />
        )
      }
      facts={[
        {
          key: 'won',
          value: won,
          label: t('review.duels.panel.pair.killed', { name: nameOf(row) }),
        },
        {
          key: 'lost',
          value: lost,
          label: t('review.duels.panel.pair.killed', { name: nameOf(column) }),
        },
      ]}
    >
      <WeaponGroup
        title={<Text path="review.duels.panel.pair.weapons" />}
        duels={shown}
        kills={demo.events.kills}
      />
    </Layout>
  );
}

function DuelReading({
  demo,
  duel,
  isOpening,
  nameOf,
  onOpenOnStage,
}: Pick<Props, 'demo' | 'nameOf' | 'onOpenOnStage'> & { duel: Duel; isOpening: boolean }) {
  const kill = demo.events.kills[duel.killIndex];
  const round = duel.roundIndex + 1;

  return (
    <Layout
      kind={
        <Text
          path={isOpening ? 'review.duels.panel.duel.kindOpening' : 'review.duels.panel.duel.kind'}
          values={{ round }}
        />
      }
      title={`${nameOf(duel.attacker)} → ${nameOf(duel.victim)}`}
      text={
        <>
          <p className="flex flex-wrap items-center gap-x-2">
            <span className="text-ink">{duelWeapons([duel], demo.events.kills)[0]?.value}</span>
            {kill?.isHeadshot === true && (
              <span className="flex items-center gap-1">
                <KillMark kind="headshot" />
                <Text path="review.duels.panel.duel.headshot" />
              </span>
            )}
            {kill?.isWallbang === true && <KillMark kind="wallbang" />}
            {kill?.isThroughSmoke === true && <KillMark kind="smoke" />}
          </p>
          <p>
            <Text
              path="review.duels.panel.duel.text"
              values={{ name: nameOf(duel.attacker), side: duel.attackerSide ?? '' }}
            />
          </p>
        </>
      }
    >
      <button
        type="button"
        onClick={() => onOpenOnStage(stageFrameForDuel(demo, duel))}
        className="mt-auto flex h-10 items-center justify-center gap-2 rounded-card border border-line-strong bg-surface-3 text-13 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M7 4l13 8-13 8z" />
        </svg>
        <Text path="review.duels.panel.duel.watch" values={{ round }} />
      </button>
    </Layout>
  );
}

/**
 * What the selection means, said in words and figures beside the map — #568. Four readings, the
 * narrowest wins: one duel, a pair, a player, and with nothing chosen the mode itself.
 *
 * Every figure is read off the duels already derived for the mode, so nothing here touches the
 * track, and a press in this panel is a press in the grid: it sets the same narrowing.
 */
export function DuelPanel(props: Props) {
  const { narrowing, shown } = props;
  const chosen =
    narrowing.duel === null ? undefined : shown.find((duel) => duel.killIndex === narrowing.duel);

  if (chosen !== undefined) {
    return (
      <DuelReading
        demo={props.demo}
        duel={chosen}
        isOpening={narrowing.mode === 'openings'}
        nameOf={props.nameOf}
        onOpenOnStage={props.onOpenOnStage}
      />
    );
  }

  if (narrowing.pair !== null) {
    return (
      <PairReading demo={props.demo} pair={narrowing.pair} shown={shown} nameOf={props.nameOf} />
    );
  }

  if (narrowing.player !== null) {
    return <PlayerReading {...props} slot={narrowing.player} />;
  }

  return <Overview {...props} />;
}
