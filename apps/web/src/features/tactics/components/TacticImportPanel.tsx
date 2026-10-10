import { effectiveSteps, rootPlan, type Tactic } from '@disa/demo-core';
import { Text, useLocale, useT } from '@disa/i18n';
import { nameOrFallback } from '@disa/tactic-board';
import { Button, cn } from '@disa/ui';
import { Upload } from 'lucide-react';
import { type DragEvent, useRef, useState } from 'react';
import {
  type ConflictChoice,
  type ImportConflict,
  type ImportPlan,
  planImport,
  readTacticsFile,
  tacticsToWrite,
} from '../helpers/tactic-transfer';

type State =
  | { readonly kind: 'idle' }
  | { readonly kind: 'failed' }
  | {
      readonly kind: 'review';
      readonly plan: ImportPlan;
      readonly choices: ReadonlyMap<string, ConflictChoice>;
    }
  | { readonly kind: 'done'; readonly written: number; readonly unchanged: number };

interface TacticImportPanelProps {
  readonly readLibrary: () => Promise<readonly Tactic[]>;
  readonly write: (tactics: readonly Tactic[]) => Promise<void>;
  /** Called once tactics have been written, so a list behind the dialog can refresh. */
  readonly onImported: (written: readonly Tactic[]) => void;
  readonly onClose: () => void;
}

function mainStepCount(tactic: Tactic): number {
  const root = rootPlan(tactic);
  return root === undefined ? 0 : effectiveSteps(tactic, root.id).length;
}

function Version({
  tactic,
  label,
}: {
  readonly tactic: Tactic;
  readonly label: 'yours' | 'incoming';
}) {
  const locale = useLocale();
  const when = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    tactic.updatedAt,
  );
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="font-semibold text-12 text-ink">
        <Text path={`library.tactics.transfer.${label}`} />
      </span>
      <span className="text-11 text-ink-dim">
        <Text
          path="library.tactics.transfer.version"
          values={{ steps: mainStepCount(tactic), when }}
        />
      </span>
    </span>
  );
}

function ConflictRow({
  conflict,
  choice,
  onChoose,
}: {
  readonly conflict: ImportConflict;
  readonly choice: ConflictChoice;
  readonly onChoose: (choice: ConflictChoice) => void;
}) {
  const t = useT();
  const title = nameOrFallback(conflict.incoming.title, t('library.tactics.untitled'));
  const sides = [
    ['yours', conflict.yours],
    ['incoming', conflict.incoming],
  ] as const;

  return (
    <li className="flex flex-col gap-2 rounded-card border border-line p-3">
      <span className="truncate font-semibold text-13 text-ink">{title}</span>
      <fieldset aria-label={title} className="m-0 grid min-w-0 grid-cols-2 gap-2 border-none p-0">
        {sides.map(([side, tactic]) => (
          <button
            key={side}
            type="button"
            aria-pressed={choice === side}
            onClick={() => onChoose(side)}
            className={cn(
              'cursor-pointer rounded-chip border px-3 py-2 text-start transition-colors duration-(--duration-micro) ease-out',
              choice === side ? 'border-line-strong bg-surface-3' : 'border-line hover:bg-hover',
            )}
          >
            <Version tactic={tactic} label={side} />
          </button>
        ))}
      </fieldset>
    </li>
  );
}

/** Drop or pick a `.json`: new tactics go in, and a tactic that is already here asks which one to keep. */
export function TacticImportPanel({
  readLibrary,
  write,
  onImported,
  onClose,
}: TacticImportPanelProps) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [isOver, setIsOver] = useState(false);

  const read = async (file: File) => {
    try {
      const incoming = readTacticsFile(await file.text());
      const plan = planImport(await readLibrary(), incoming);
      if (plan.conflicts.length > 0) {
        setState({ kind: 'review', plan, choices: new Map() });
        return;
      }
      if (plan.fresh.length > 0) {
        await write(plan.fresh);
        onImported(plan.fresh);
      }
      setState({ kind: 'done', written: plan.fresh.length, unchanged: plan.unchanged });
    } catch {
      setState({ kind: 'failed' });
    }
  };

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file !== undefined) void read(file);
  };

  const drop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsOver(false);
    pick(event.dataTransfer.files);
  };

  const confirm = async (plan: ImportPlan, choices: ReadonlyMap<string, ConflictChoice>) => {
    const tactics = tacticsToWrite(plan, choices);
    try {
      if (tactics.length > 0) {
        await write(tactics);
        onImported(tactics);
      }
      setState({
        kind: 'done',
        written: tactics.length,
        unchanged: plan.unchanged,
      });
    } catch {
      setState({ kind: 'failed' });
    }
  };

  const chooser = (
    <>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label={t('library.tactics.transfer.tabImport')}
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={drop}
        className={cn(
          'flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border border-dashed text-ink transition-colors duration-(--duration-micro) ease-out',
          isOver ? 'border-ink bg-hover' : 'border-line-strong hover:bg-hover',
        )}
      >
        <Upload aria-hidden="true" className="size-5" />
        <span className="font-medium text-14">
          <Text
            path={
              isOver ? 'library.tactics.transfer.dropActive' : 'library.tactics.transfer.dropTitle'
            }
          />
        </span>
        <span className="text-12 text-ink-faint">
          <Text path="library.tactics.transfer.dropHint" />
        </span>
      </button>
    </>
  );

  if (state.kind === 'review') {
    const { plan, choices } = state;
    const count = tacticsToWrite(plan, choices).length;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold text-14 text-ink">
            <Text
              path="library.tactics.transfer.conflictTitle"
              values={{ count: plan.conflicts.length }}
            />
          </h3>
          <p className="text-12 text-ink-dim">
            <Text path="library.tactics.transfer.conflictHint" />
          </p>
        </div>
        <ul className="m-0 flex max-h-72 list-none flex-col gap-2 overflow-y-auto p-0">
          {plan.conflicts.map((conflict) => (
            <ConflictRow
              key={conflict.incoming.id}
              conflict={conflict}
              choice={choices.get(conflict.incoming.id) ?? 'yours'}
              onChoose={(choice) =>
                setState({
                  kind: 'review',
                  plan,
                  choices: new Map(choices).set(conflict.incoming.id, choice),
                })
              }
            />
          ))}
        </ul>
        <Button size="lg" onClick={() => void confirm(plan, choices)}>
          {count === 0 ? (
            <Text path="library.tactics.transfer.keepAll" />
          ) : (
            <Text path="library.tactics.transfer.importAction" values={{ count }} />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {state.kind === 'done' ? (
        <div role="status" className="flex flex-col gap-1 rounded-card border border-line p-3">
          <p className="font-semibold text-14 text-ink">
            {state.written > 0 ? (
              <Text path="library.tactics.transfer.done" values={{ count: state.written }} />
            ) : (
              <Text path="library.tactics.transfer.doneNone" />
            )}
          </p>
          {state.unchanged > 0 && (
            <p className="text-12 text-ink-dim">
              <Text path="library.tactics.transfer.unchanged" values={{ count: state.unchanged }} />
            </p>
          )}
        </div>
      ) : null}
      {state.kind === 'failed' && (
        <p role="alert" className="rounded-card border border-line p-3 text-13 text-ink">
          <Text path="library.tactics.transfer.failed" />
        </p>
      )}
      {chooser}
      {state.kind === 'done' && (
        <Button variant="outline" onClick={onClose}>
          <Text path="library.tactics.transfer.close" />
        </Button>
      )}
      <p className="text-11 text-ink-faint leading-prose">
        <Text path="library.tactics.transfer.importNote" />
      </p>
    </div>
  );
}
