import { GRENADE_REFERENCES } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { useMemo } from 'react';
import { AXIS_TICK_SECONDS, axisFraction, sortByDuration } from '../helpers/grenade-axis';
import { GRENADE_INK } from '../helpers/grenade-ink';

const ROW_GRID = 'sm:grid sm:grid-cols-[10.5rem_minmax(0,1fr)_4rem] sm:items-center sm:gap-3';

export function GrenadeDurationChart() {
  const t = useT();
  const rows = useMemo(() => sortByDuration(GRENADE_REFERENCES), []);

  return (
    <section className="surface-card flex flex-col gap-3 rounded-card p-3.5 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="label-dense text-ink-dim">
          <Text path="library.tools.grenades.chartTitle" />
        </h4>
        <span className="text-12 text-ink-faint">
          <Text path="library.tools.grenades.chartHint" />
        </span>
      </div>
      <ul className="flex flex-col gap-3 sm:gap-2.5">
        {rows.map((g) => {
          const fraction = axisFraction(g.durationSeconds);
          return (
            <li key={g.id} className={`flex flex-col gap-1 ${ROW_GRID}`}>
              <div className="flex items-baseline justify-between gap-3 sm:contents">
                <span className="text-12 sm:text-13">{g.name}</span>
                <span className="numeric text-12 text-ink-dim sm:order-last sm:text-right sm:text-13">
                  {g.durationSeconds === null ? (
                    <Text path="library.tools.grenades.chartInstant" />
                  ) : (
                    <Text
                      path="library.tools.grenades.seconds"
                      values={{ seconds: g.durationSeconds }}
                    />
                  )}
                </span>
              </div>
              <div className="relative h-2.5 rounded-chip bg-surface-2 sm:h-3.5">
                <div
                  className={`absolute inset-y-0 left-0 min-w-1 rounded-chip ${GRENADE_INK[g.id].bar}`}
                  style={{ width: `${fraction * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div
        role="img"
        aria-label={t('library.tools.grenades.axisLabel')}
        className="hidden sm:grid sm:grid-cols-[10.5rem_minmax(0,1fr)_4rem] sm:gap-3"
      >
        <span />
        <div className="numeric flex justify-between text-11 text-ink-faint">
          {AXIS_TICK_SECONDS.map((s, i) =>
            i === 0 || i === AXIS_TICK_SECONDS.length - 1 ? (
              <Text key={s} path="library.tools.grenades.axisSeconds" values={{ seconds: s }} />
            ) : (
              <span key={s}>{s}</span>
            ),
          )}
        </div>
        <span />
      </div>
    </section>
  );
}
