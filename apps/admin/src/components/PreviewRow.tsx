import type { PreviewItem, ResolutionAction } from '@disa/admin-contract';
import { LINEUP_TAGS, type Lineup, toggledLineupTag } from '@disa/demo-core';
import { Text, type TranslationKey, useT } from '@disa/i18n';
import { cn, Input } from '@disa/ui';
import { ACTIONS, type Decision } from '../helpers/decisions';
import { DiffList } from './DiffList';
import { SELECT_CLASS } from './MapPicker';
import { PhotoStrip } from './PhotoStrip';

const ACTION_KEYS: Readonly<Record<ResolutionAction, TranslationKey>> = {
  add: 'admin.action.add',
  replace: 'admin.action.replace',
  'keep-both': 'admin.action.keepBoth',
  skip: 'admin.action.skip',
};

// The same wording as the lineups library, so a tag reads the same in both.
const TAG_KEYS = { meta: 'library.lineups.tags.meta', old: 'library.lineups.tags.old' } as const;

export function PreviewRow({
  item,
  lineup,
  images,
  decision,
  onChange,
}: {
  item: PreviewItem;
  lineup: Lineup;
  images: Readonly<Record<string, string>>;
  decision: Decision;
  onChange: (next: Decision) => void;
}) {
  const t = useT();
  const skipped = decision.action === 'skip';
  const fixed = item.status === 'unchanged';

  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-card border border-line bg-surface-2 p-3',
        skipped && 'opacity-70',
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <PhotoStrip
          urls={lineup.imageUrls ?? []}
          captions={lineup.imageCaptions ?? []}
          images={images}
        />
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <label className="sr-only" htmlFor={`title-${item.id}`}>
            <Text path="admin.row.title" />
          </label>
          <Input
            id={`title-${item.id}`}
            value={decision.title}
            disabled={fixed}
            onChange={(event) => onChange({ ...decision, title: event.currentTarget.value })}
          />
          <p className="numeric text-12 text-ink-dim">
            {lineup.kind} · {lineup.side} · {item.id}
          </p>
          {item.candidate === undefined ? null : (
            <p className="text-12 text-ink">
              <Text
                path="admin.row.candidate"
                values={{ title: item.candidate.title, id: item.candidate.id }}
              />
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <fieldset className="flex items-center gap-1" disabled={fixed}>
            <legend className="sr-only">
              <Text path="admin.row.tags" />
            </legend>
            {LINEUP_TAGS.map((tag) => {
              const on = decision.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    onChange({ ...decision, tags: toggledLineupTag(decision.tags, tag) })
                  }
                  className={cn(
                    'h-control rounded-chip border border-line px-2 text-12 text-ink-dim hover:border-line-strong disabled:opacity-50',
                    on && 'border-ink bg-selected text-ink',
                  )}
                >
                  <Text path={TAG_KEYS[tag]} />
                </button>
              );
            })}
          </fieldset>
          <select
            className={SELECT_CLASS}
            aria-label={t('admin.action.label', { title: lineup.title })}
            value={decision.action}
            disabled={fixed}
            onChange={(event) => {
              const action = ACTIONS[item.status].find(
                (value) => value === event.currentTarget.value,
              );
              if (action !== undefined) onChange({ ...decision, action });
            }}
          >
            {ACTIONS[item.status].map((action) => (
              <option key={action} value={action}>
                {t(ACTION_KEYS[action])}
              </option>
            ))}
          </select>
        </div>
      </div>
      {item.diff === undefined || item.diff.length === 0 ? null : (
        <details>
          <summary className="cursor-pointer text-12 text-ink-dim hover:text-ink">
            <Text path="admin.row.diff" values={{ count: item.diff.length }} />
          </summary>
          <div className="pt-2">
            <DiffList diff={item.diff} images={images} />
          </div>
        </details>
      )}
    </li>
  );
}
