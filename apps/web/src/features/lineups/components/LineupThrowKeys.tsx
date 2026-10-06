import type { Lineup } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { heldKeys, spokenButtons } from '../helpers/lineup-how';

const KEY = 'rounded-chip border border-line-strong bg-surface-3 px-1.5 font-mono text-11 text-ink';

/** How a lineup is thrown, said once: its throw type, then the keys and buttons held for it. */
export function LineupThrowKeys({ lineup }: { lineup: Lineup }) {
  const t = useT();

  return (
    <>
      <Text path={`review.maps.throw.types.${lineup.throwType}`} />
      {heldKeys(lineup).map((key) => (
        <kbd key={key} className={KEY}>
          {key === 'Jump' ? t('library.lineups.keys.jump') : key}
        </kbd>
      ))}
      {spokenButtons(lineup).map((button) => (
        <kbd key={button} className={KEY}>
          <Text path={`library.lineups.mouseShort.${button}`} />
        </kbd>
      ))}
    </>
  );
}
