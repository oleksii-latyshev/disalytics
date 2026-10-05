import type { Lineup } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { heldKeys, spokenButtons, standLabel } from '../helpers/lineup-how';
import { LineupCopyButton } from './LineupCopyButton';

const KEY = 'rounded-chip border border-line-strong bg-surface-3 px-1.5 font-mono text-11 text-ink';

interface Props {
  map: string;
  lineup: Lineup;
}

/** Everything needed to throw it again: where to stand, where to aim, how, and the console command. */
export function LineupHowToRepeat({ map, lineup }: Props) {
  const t = useT();
  const buttons = spokenButtons(lineup);

  return (
    <section className="flex flex-col gap-2.5 rounded-card bg-surface-2 p-3">
      <h3 className="label-dense text-ink-dim">
        <Text path="library.lineups.howTo.title" />
      </h3>

      <dl className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-2 gap-y-2.5 text-13 leading-snug">
        <dt className="text-ink-dim">
          <Text path="library.lineups.howTo.stand" />
        </dt>
        <dd>{standLabel(map, lineup)}</dd>

        <dt className="text-ink-dim">
          <Text path="library.lineups.howTo.aim" />
        </dt>
        <dd className={lineup.notes ? '' : 'text-ink-faint'}>
          {lineup.notes ? lineup.notes : <Text path="library.lineups.howTo.noAim" />}
        </dd>

        <dt className="text-ink-dim">
          <Text path="library.lineups.howTo.throw" />
        </dt>
        <dd className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-1">
            <Text path={`review.maps.throw.types.${lineup.throwType}`} />
            {heldKeys(lineup).map((key) => (
              <kbd key={key} className={KEY}>
                {key === 'Jump' ? t('library.lineups.keys.jump') : key}
              </kbd>
            ))}
            {buttons.map((button) => (
              <kbd key={button} className={KEY}>
                <Text path={`library.lineups.mouseShort.${button}`} />
              </kbd>
            ))}
          </span>
          {lineup.movementInstructions && (
            <span className="text-ink-dim">{lineup.movementInstructions}</span>
          )}
        </dd>

        <dt className="text-ink-dim">
          <Text path="library.lineups.howTo.console" />
        </dt>
        <dd className="flex min-w-0 items-center gap-1.5">
          {lineup.command ? (
            <>
              <code
                title={lineup.command}
                className="min-w-0 flex-1 select-all truncate font-mono text-11 text-ink"
              >
                {lineup.command}
              </code>
              <LineupCopyButton text={lineup.command} />
            </>
          ) : (
            <span className="text-12 text-ink-faint">
              <Text path="library.lineups.howTo.noCommand" />
            </span>
          )}
        </dd>
      </dl>
    </section>
  );
}
