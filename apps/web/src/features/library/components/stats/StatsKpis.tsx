import type { PlayerSummary } from '@disa/demo-core';
import { useLocale, useT } from '@disa/i18n';
import { useMemo } from 'react';
import { adrByMap, type ProfileMatch } from '../../helpers/player-profile';

interface Tile {
  label: string;
  value: string;
  sub: string;
}

interface Props {
  summary: PlayerSummary;
  matches: readonly ProfileMatch[];
  /** Per-map damage reads as a comparison only when the tiles cover more than one map. */
  isAcrossMaps: boolean;
}

const MAPS_IN_SUB = 2;

export function StatsKpis({ summary, matches, isAcrossMaps }: Props) {
  const t = useT();
  const locale = useLocale();
  const number = useMemo(
    () => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    [locale],
  );
  const percent = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
    [locale],
  );

  const perMap = isAcrossMaps ? adrByMap(matches) : [];
  const adrSub =
    perMap.length > 1
      ? perMap
          .slice(0, MAPS_IN_SUB)
          .map(({ map, adr }) => `${map.replace(/^de_/, '')} ${number.format(adr)}`)
          .join(' · ')
      : t('library.stats.kpi.adr.subRounds', { rounds: summary.rounds });

  const tiles: readonly Tile[] = [
    {
      label: t('library.stats.kpi.kd.label'),
      value: `${summary.kills}–${summary.deaths}`,
      sub: t('library.stats.kpi.kd.sub', { kd: summary.kd, assists: summary.assists }),
    },
    {
      label: t('library.stats.kpi.adr.label'),
      value: number.format(summary.adr),
      sub: adrSub,
    },
    {
      label: t('library.stats.kpi.hs.label'),
      value: percent.format(summary.headshotPercent / 100),
      sub: t('library.stats.kpi.hs.sub', { headshots: summary.headshots, kills: summary.kills }),
    },
    {
      label: t('library.stats.kpi.kast.label'),
      value: percent.format(summary.kastPercent / 100),
      sub: t('library.stats.kpi.kast.sub', { kast: summary.kastRounds, rounds: summary.rounds }),
    },
    {
      label: t('library.stats.kpi.opening.label'),
      value: `${summary.openingWon} / ${summary.openingWon + summary.openingLost}`,
      sub: t('library.stats.kpi.opening.sub'),
    },
    {
      label: t('library.stats.kpi.clutch.label'),
      value: String(summary.clutchesWon),
      sub:
        summary.bestClutch === 0
          ? t('library.stats.kpi.clutch.none')
          : t('library.stats.kpi.clutch.best', { count: summary.bestClutch }),
    },
  ];

  return (
    <ul className="grid list-none grid-cols-2 gap-2.5 p-0 md:gap-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <li
          key={tile.label}
          className="flex min-w-0 flex-col gap-1 rounded-card border border-line bg-surface-1 p-3.5 md:gap-1.5 md:p-4"
        >
          <span className="text-12 text-ink-dim leading-dense">{tile.label}</span>
          <span className="numeric font-mono text-20 leading-dense md:text-28">{tile.value}</span>
          <span className="numeric font-mono text-11 text-ink-faint leading-prose [overflow-wrap:anywhere]">
            {tile.sub}
          </span>
        </li>
      ))}
    </ul>
  );
}
