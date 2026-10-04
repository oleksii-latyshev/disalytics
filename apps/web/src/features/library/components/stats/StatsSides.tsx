import type { PlayerSummary, Team } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';

const HEADING = 'label-dense text-ink-dim';
const SIDES: readonly { side: Team; ink: string; bar: string }[] = [
  { side: 'CT', ink: 'text-ct', bar: 'bg-ct' },
  { side: 'T', ink: 'text-t', bar: 'bg-t' },
];

function Bar({ share, tone }: { share: number; tone: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${share * 100}%` }} />
    </div>
  );
}

export function StatsSides({ summary }: { summary: PlayerSummary }) {
  const t = useT();

  return (
    <section className="flex flex-col gap-3 rounded-float border border-line bg-surface-1 px-4 py-4 md:px-5 md:py-[18px]">
      <h3 className={HEADING}>
        <Text path="library.stats.side.title" />
      </h3>
      {SIDES.map(({ side, ink, bar }) => {
        const record = summary.sides[side];

        return (
          <div key={side} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-14">
              <span className={`font-semibold ${ink}`}>{side}</span>
              <span className="numeric text-right font-mono text-13">
                {t('library.stats.side.record', {
                  kills: record.kills,
                  deaths: record.deaths,
                  won: record.roundsWon,
                  rounds: record.rounds,
                })}
              </span>
            </div>
            <Bar share={record.rounds === 0 ? 0 : record.roundsWon / record.rounds} tone={bar} />
          </div>
        );
      })}
      <p className="text-12 text-ink-faint">
        <Text path="library.stats.side.note" />
      </p>
    </section>
  );
}

const WEAPONS_SHOWN = 8;

export function StatsWeapons({ summary }: { summary: PlayerSummary }) {
  const shown = summary.weapons.slice(0, WEAPONS_SHOWN);
  const top = shown[0]?.kills ?? 1;

  return (
    <section className="flex flex-col gap-2.5 rounded-float border border-line bg-surface-1 px-4 py-4 md:px-5 md:py-[18px]">
      <h3 className={HEADING}>
        <Text path="library.stats.weapons.title" />
      </h3>
      {shown.length === 0 && (
        <p className="text-13 text-ink-dim">
          <Text path="library.stats.weapons.empty" />
        </p>
      )}
      {shown.map(({ weapon, kills }) => (
        <div
          key={weapon}
          className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_1.75rem] items-center gap-2.5"
        >
          <span className="truncate font-mono text-12 md:text-13">{weapon}</span>
          <Bar share={kills / top} tone="bg-ink" />
          <span className="numeric text-right font-mono text-12 text-ink-dim md:text-13">
            {kills}
          </span>
        </div>
      ))}
    </section>
  );
}
