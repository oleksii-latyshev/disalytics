import type { WeaponReference } from '@disa/demo-core';
import { Text } from '@disa/i18n';

const TONE = {
  ct: 'bg-ct/12 text-ct',
  t: 'bg-t/12 text-t',
  both: 'bg-surface-2 text-ink-dim',
} as const;

export function SideBadge({ team }: { team: WeaponReference['team'] }) {
  return (
    <span
      className={`inline-block min-w-[2.25rem] rounded-chip px-1.5 py-0.5 text-center font-mono text-11 font-semibold ${TONE[team]}`}
    >
      {team === 'both' ? (
        <Text path="library.tools.weapons.sides.any" />
      ) : team === 'ct' ? (
        <Text path="library.tools.weapons.sides.ct" />
      ) : (
        <Text path="library.tools.weapons.sides.t" />
      )}
    </span>
  );
}
