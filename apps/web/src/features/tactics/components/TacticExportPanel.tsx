import type { Tactic } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, cn } from '@disa/ui';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { saveDownload } from '../helpers/save-download';
import { nameOrFallback } from '../helpers/tactic-names';
import { libraryDownload, tacticDownload } from '../helpers/tactic-transfer';

type Scope = 'one' | 'library';

interface TacticExportPanelProps {
  /** The tactic being edited, when the dialog is opened from the editor. */
  readonly tactic: Tactic | null;
  readonly library: readonly Tactic[];
}

/** Every step once, shared steps counted by the plan that stores them. */
function stepTotal(tactic: Tactic): number {
  return tactic.plans.reduce((sum, plan) => sum + plan.steps.length, 0);
}

const OPTION =
  'flex w-full cursor-pointer items-start gap-3 rounded-card border p-3 text-start transition-colors duration-(--duration-micro) ease-out';

/** What goes into the file: this tactic with all its branches, or the whole library. */
export function TacticExportPanel({ tactic, library }: TacticExportPanelProps) {
  const t = useT();
  const [chosen, setChosen] = useState<Scope>('one');
  const scope: Scope = tactic === null ? 'library' : chosen;
  const options: readonly Scope[] = tactic === null ? ['library'] : ['one', 'library'];
  const isEmpty = scope === 'library' && library.length === 0;

  const download = () => {
    if (scope === 'one' && tactic !== null) saveDownload(tacticDownload(tactic));
    else saveDownload(libraryDownload(library, new Date()));
  };

  return (
    <div className="flex flex-col gap-2">
      <fieldset
        aria-label={t('library.tactics.transfer.scopeLabel')}
        className="m-0 flex min-w-0 flex-col gap-2 border-none p-0"
      >
        {options.map((option) => {
          const isOn = option === scope;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isOn}
              onClick={() => setChosen(option)}
              className={cn(
                OPTION,
                isOn ? 'border-line-strong bg-surface-2' : 'border-line hover:bg-hover',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 size-4 flex-none rounded-full border',
                  isOn
                    ? 'border-ink [box-shadow:inset_0_0_0_3px_var(--color-surface-2)] bg-ink'
                    : 'border-line-strong',
                )}
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-semibold text-14 text-ink">
                  {option === 'one' && tactic !== null ? (
                    <Text
                      path="library.tactics.transfer.scopeOne"
                      values={{
                        title: nameOrFallback(tactic.title, t('library.tactics.untitled')),
                      }}
                    />
                  ) : (
                    <Text path="library.tactics.transfer.scopeLibrary" />
                  )}
                </span>
                <span className="text-12 text-ink-dim">
                  {option === 'one' && tactic !== null ? (
                    <Text
                      path="library.tactics.transfer.scopeOneMeta"
                      values={{ plans: tactic.plans.length, steps: stepTotal(tactic) }}
                    />
                  ) : (
                    <Text
                      path="library.tactics.transfer.scopeLibraryMeta"
                      values={{ count: library.length }}
                    />
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </fieldset>

      <Button size="lg" onClick={download} disabled={isEmpty}>
        <Download aria-hidden="true" />
        <Text
          path={
            scope === 'one'
              ? 'library.tactics.transfer.downloadOne'
              : 'library.tactics.transfer.downloadLibrary'
          }
        />
      </Button>
      <p className="text-11 text-ink-faint leading-prose">
        <Text path="library.tactics.transfer.exportNote" />
      </p>
    </div>
  );
}
