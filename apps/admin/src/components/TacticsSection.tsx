import type {
  DecisionAction,
  TacticPreviewItem,
  TacticProblemCode,
  TacticStatus,
} from '@disa/admin-contract';
import { Text, type TranslationKey, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useState } from 'react';
import { call, type Failure, isFailure } from '../api/client';
import {
  choiceOf,
  choicesOf,
  decisionsOf,
  describeDiff,
  type LoadedTacticFile,
  readTacticFile,
  savingCount,
} from '../helpers/tactics';
import { useResource } from '../hooks/use-resource';
import { FileDrop } from './FileDrop';
import { Card, Dot, Pill } from './flow/Parts';
import type { Tone } from './flow/status';
import { Notice } from './Notice';
import { Muted } from './Section';

const STATUS_TONE: Readonly<Record<TacticStatus, Tone>> = {
  new: 'new',
  update: 'update',
  unchanged: 'same',
};

const PROBLEM_KEYS: Readonly<Record<TacticProblemCode, TranslationKey>> = {
  invalid_tactic: 'admin.tactics.problem.invalid_tactic',
  invalid_map: 'admin.tactics.problem.invalid_map',
  title_blank: 'admin.tactics.problem.title_blank',
  title_too_long: 'admin.tactics.problem.title_too_long',
  too_large: 'admin.tactics.problem.too_large',
};

const FIELD_KEYS: Readonly<Record<string, TranslationKey>> = {
  title: 'admin.tactics.field.title',
  map: 'admin.tactics.field.map',
  side: 'admin.tactics.field.side',
  rounds: 'admin.tactics.field.rounds',
  description: 'admin.tactics.field.description',
  author: 'admin.tactics.field.author',
  weapons: 'admin.tactics.field.weapons',
  steps: 'admin.tactics.field.steps',
  plans: 'admin.tactics.field.plans',
  content: 'admin.tactics.field.content',
};

interface Saved {
  readonly saved: number;
  readonly skipped: number;
}

function failureOf(error: unknown): Failure {
  return isFailure(error) ? error : { key: 'admin.error.network', detail: undefined };
}

function Changes({ item }: { item: TacticPreviewItem }) {
  const t = useT();
  return (
    <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-13 text-ink-dim">
      {item.diff.map((diff) => {
        const { field, change } = describeDiff(diff);
        const label = FIELD_KEYS[field];
        return (
          <li key={field} className="[overflow-wrap:anywhere]">
            {label === undefined ? field : t(label)}
            {change === null ? null : <span className="numeric">{`: ${change}`}</span>}
          </li>
        );
      })}
      {item.problems.map((problem) => (
        <li key={problem} className="text-[var(--status-invalid)]" role="alert">
          <Text path={PROBLEM_KEYS[problem]} />
        </li>
      ))}
    </ul>
  );
}

function Choices({
  item,
  value,
  onChange,
}: {
  item: TacticPreviewItem;
  value: DecisionAction;
  onChange: (action: DecisionAction) => void;
}) {
  const choices = choicesOf(item);
  if (choices.length < 2) {
    return (
      <span className="text-13 text-ink-dim">
        <Text path="admin.tactics.nothingToDo" />
      </span>
    );
  }
  return (
    <span className="flex gap-1.5">
      {choices.map((action) => (
        <Button
          key={action}
          variant={value === action ? 'primary' : 'outline'}
          aria-pressed={value === action}
          onClick={() => onChange(action)}
        >
          <Text path={`admin.tactics.choice.${action}`} />
        </Button>
      ))}
    </span>
  );
}

/**
 * Importing built-in tactics: a tactic file from the app is read against the site by id, each
 * tactic is added, replaced or skipped, and one press saves the lot. A tactic is JSON only, so it
 * goes in one request.
 */
export function TacticsSection({ onChanged }: { onChanged: () => void }) {
  const [loaded, setLoaded] = useState<{ id: number; file: LoadedTacticFile } | null>(null);
  const [problem, setProblem] = useState<Failure | null>(null);
  const [chosen, setChosen] = useState<Readonly<Record<string, DecisionAction>>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);

  const [preview, reload] = useResource(loaded === null ? null : `tactics:${loaded.id}`, () =>
    call((client) => client.tactics.preview({ payload: { file: loaded?.file.file } })),
  );

  const open = (name: string, text: string) => {
    const result = readTacticFile(name, text);
    setSaved(null);
    setFailure(null);
    setChosen({});
    if (result.ok) {
      setProblem(null);
      setLoaded({ id: (loaded?.id ?? 0) + 1, file: result.loaded });
    } else {
      setProblem({ key: result.key, detail: result.detail });
      setLoaded(null);
    }
  };

  const items = preview.status === 'ready' ? preview.data.items : [];
  const count = savingCount(items, chosen);

  const save = async () => {
    setSaving(true);
    setFailure(null);
    try {
      const result = await call((client) =>
        client.tactics.commit({ payload: { decisions: decisionsOf(items, chosen) } }),
      );
      setSaved({ saved: result.saved, skipped: result.skipped });
      setChosen({});
      onChanged();
      reload();
    } catch (error) {
      setFailure(failureOf(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold text-20 text-ink">
        <Text path="admin.tactics.title" />
      </h2>
      <p className="max-w-[62ch] text-14 text-ink-dim">
        <Text path="admin.tactics.hint" />
      </p>
      <FileDrop
        kind="tactics"
        file={loaded === null ? null : { name: loaded.file.name, count: loaded.file.count }}
        onFile={open}
      />
      {problem === null ? null : <Notice failure={problem} />}
      {loaded !== null && (preview.status === 'loading' || preview.status === 'idle') ? (
        <Muted>
          <Text path="admin.tactics.comparing" />
        </Muted>
      ) : null}
      {preview.status === 'error' ? <Notice failure={preview.failure} onRetry={reload} /> : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-chip border border-line bg-surface-2 p-3 max-sm:grid-cols-1"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2">
                <b className="font-medium text-14 text-ink [overflow-wrap:anywhere]">
                  {item.title}
                </b>
                <Pill tone={STATUS_TONE[item.status]}>
                  <Text path={`admin.tactics.status.${item.status}`} />
                </Pill>
              </span>
              <Changes item={item} />
            </span>
            <Choices
              item={item}
              value={choiceOf(item, chosen)}
              onChange={(action) => setChosen({ ...chosen, [item.id]: action })}
            />
          </li>
        ))}
      </ul>
      {failure === null ? null : <Notice failure={failure} />}
      {saved === null ? null : (
        <p className="flex flex-wrap items-center gap-2 text-14 text-ink">
          <Dot tone="new" />
          <Text path="admin.tactics.saved" values={{ count: saved.saved }} />
          {saved.skipped > 0 ? (
            <span className="text-ink-dim">
              <Text path="admin.tactics.skipped" values={{ count: saved.skipped }} />
            </span>
          ) : null}
        </p>
      )}
      {items.length > 0 ? (
        <div>
          <Button disabled={saving || count === 0} onClick={() => void save()}>
            <Text path="admin.tactics.save" values={{ count }} />
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
