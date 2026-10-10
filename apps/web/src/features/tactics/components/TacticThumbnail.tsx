import type { Tactic } from '@disa/demo-core';
import { getMapOverview, radarAssetPath } from '@disa/map-data';
import { tacticSketch } from '@disa/tactic-board';
import { useMemo } from 'react';
import { useSetting } from '@/core/settings';
import { levelAt } from '@/features/radar';

export function TacticThumbnail({ tactic }: { readonly tactic: Tactic }) {
  const [theme] = useSetting('radarTheme');
  const sketch = useMemo(() => tacticSketch(tactic), [tactic]);
  const overview = getMapOverview(tactic.map);
  const tone = tactic.side === 'CT' ? 'text-ct' : 'text-t';

  return (
    <div className="relative size-24 flex-none overflow-hidden rounded-chip bg-surface-0 sm:size-40">
      {overview !== undefined && (
        <img
          src={`${import.meta.env.BASE_URL}${radarAssetPath(levelAt(overview, 0), theme)}`}
          alt=""
          className="absolute inset-0 size-full object-contain"
        />
      )}
      {sketch !== null && (
        <svg
          viewBox="0 0 1024 1024"
          className={`absolute inset-0 size-full ${tone}`}
          aria-hidden="true"
        >
          {sketch.smokes.map((point) => (
            <circle
              key={`${point.x}:${point.y}`}
              cx={point.x}
              cy={point.y}
              r={44}
              className="fill-ink-dim/60 stroke-ink-dim"
              strokeWidth={6}
            />
          ))}
          {sketch.trails.map((trail) => (
            <g key={trail.d}>
              <path
                d={trail.d}
                fill="none"
                stroke="currentColor"
                strokeWidth={12}
                strokeLinecap="round"
                strokeDasharray="26 18"
              />
              <circle
                cx={trail.end.x}
                cy={trail.end.y}
                r={22}
                fill="currentColor"
                className="stroke-surface-0"
                strokeWidth={8}
              />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
