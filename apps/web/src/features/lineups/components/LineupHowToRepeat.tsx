import type { Lineup } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { standLabel } from '../helpers/lineup-how';
import { LineupCopyButton } from './LineupCopyButton';
import { LineupThrowKeys } from './LineupThrowKeys';

interface Props {
  map: string;
  lineup: Lineup;
  /** Whether a long command wraps rather than being cut short. */
  isCommandWrapped?: boolean;
}

/** Everything needed to throw it again: where to stand, where to aim, how, and the console command. */
export function LineupHowToRepeat({ map, lineup, isCommandWrapped = false }: Props) {
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
            <LineupThrowKeys lineup={lineup} />
          </span>
          {lineup.movementInstructions && (
            <span className="text-ink-dim">{lineup.movementInstructions}</span>
          )}
        </dd>

        <dt className="text-ink-dim">
          <Text path="library.lineups.howTo.console" />
        </dt>
        <dd className={`flex min-w-0 gap-1.5 ${isCommandWrapped ? 'items-start' : 'items-center'}`}>
          {lineup.command ? (
            <>
              <code
                title={lineup.command}
                className={`min-w-0 flex-1 select-all font-mono text-11 text-ink ${isCommandWrapped ? 'break-all' : 'truncate'}`}
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
