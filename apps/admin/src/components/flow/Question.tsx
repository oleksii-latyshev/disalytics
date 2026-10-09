import type { Lineup } from '@disa/demo-core';
import { Text, type TranslationKey, useLocale, useT } from '@disa/i18n';
import { copyFields, differingFields, type FieldId } from '../../helpers/fields';
import { gapUnits } from '../../helpers/plate-point';
import type { Choice } from '../../helpers/review';
import type { Review, Row } from '../../hooks/use-review';
import type { PointName } from '../map/MapMarks';
import { FixSteps } from './FixSteps';
import { MergeTable } from './MergeTable';
import { type Option, Options } from './Options';
import { Pill } from './Parts';
import { PhotoMerge } from './PhotoMerge';

const FIELD_LABEL: Readonly<Record<FieldId, TranslationKey>> = {
  title: 'admin.field.title',
  callout: 'admin.field.callout',
  kind: 'admin.field.kind',
  side: 'admin.field.side',
  throwType: 'admin.field.throwType',
  movement: 'admin.field.movement',
  movementInstructions: 'admin.field.movementInstructions',
  mouseButtons: 'admin.field.mouseButtons',
  notes: 'admin.field.notes',
  tags: 'admin.field.tags',
  author: 'admin.field.author',
  origin: 'admin.field.origin',
  landing: 'admin.field.landing',
  waypoints: 'admin.field.waypoints',
  aim: 'admin.field.aim',
  command: 'admin.field.command',
  landingCommand: 'admin.field.landingCommand',
  mediaUrl: 'admin.field.mediaUrl',
  groups: 'admin.field.groups',
};

type Kind = 'update' | 'duplicate' | 'error';

function kindOf(row: Row): Kind {
  if (row.item.status === 'update') return 'update';
  return row.item.status === 'duplicate' ? 'duplicate' : 'error';
}

const UPDATE_OPTIONS: readonly Option<Choice>[] = [
  { value: 'merge', title: 'admin.q.updateMerge', hint: 'admin.q.updateMergeHint' },
  { value: 'file', title: 'admin.q.updateFile', hint: 'admin.q.updateFileHint' },
  { value: 'stored', title: 'admin.q.updateStored', hint: 'admin.q.updateStoredHint' },
  { value: 'both', title: 'admin.q.updateBoth', hint: 'admin.q.updateBothHint' },
];

const DUPLICATE_OPTIONS: readonly Option<Choice>[] = [
  { value: 'merge', title: 'admin.q.dupMerge', hint: 'admin.q.dupMergeHint' },
  { value: 'add', title: 'admin.q.dupAdd', hint: 'admin.q.dupAddHint' },
  { value: 'skip', title: 'admin.q.dupSkip', hint: 'admin.q.dupSkipHint' },
];

function errorOptions(blocked: boolean): readonly Option<Choice>[] {
  return [
    {
      value: 'add',
      title: 'admin.q.errAdd',
      hint: blocked ? 'admin.q.errAddBlocked' : 'admin.q.errAddHint',
      disabled: blocked,
    },
    { value: 'skip', title: 'admin.q.errSkip', hint: 'admin.q.errSkipHint' },
  ];
}

/** A new question starts with its heading focused, so a keyboard or screen reader begins there. */
function focusOnMount(element: HTMLElement | null): void {
  element?.focus({ preventScroll: true });
}

function Heading({ row, count }: { row: Row; count: number }) {
  const locale = useLocale();
  const { item } = row;
  const title = item.edited.title.trim();
  if (item.status === 'update' && item.stored !== null) {
    return (
      <>
        <h2
          className="font-semibold text-20 text-ink outline-none"
          tabIndex={-1}
          ref={focusOnMount}
        >
          <Text path="admin.q.updateTitle" values={{ title: item.stored.title }} />
        </h2>
        <p className="max-w-[62ch] text-14 text-ink-dim">
          <ChangedLede stored={item.stored} file={item.edited} locale={locale} />
        </p>
      </>
    );
  }
  if (item.status === 'duplicate' && item.stored !== null) {
    const gap = Math.max(
      gapUnits(item.stored.origin, item.edited.origin),
      gapUnits(item.stored.landing, item.edited.landing),
    );
    return (
      <>
        <h2
          className="font-semibold text-20 text-ink outline-none"
          tabIndex={-1}
          ref={focusOnMount}
        >
          <Text path="admin.q.dupTitle" values={{ title: title || '—', site: item.stored.title }} />
        </h2>
        <p className="max-w-[62ch] text-14 text-ink-dim">
          <Text path="admin.q.dupLede" values={{ units: Math.round(gap) }} />
        </p>
      </>
    );
  }
  return (
    <>
      <h2 className="font-semibold text-20 text-ink" tabIndex={-1} ref={focusOnMount}>
        <Text
          path={
            title === ''
              ? row.problems.length === 0
                ? 'admin.q.errTitleUntitledFixed'
                : 'admin.q.errTitleUntitled'
              : row.problems.length === 0
                ? 'admin.q.errTitleFixed'
                : 'admin.q.errTitle'
          }
          values={{ title }}
        />
      </h2>
      <p className="max-w-[62ch] text-14 text-ink-dim">
        <Text
          path={row.problems.length === 0 ? 'admin.q.errLedeFixed' : 'admin.q.errLede'}
          values={{ count }}
        />
      </p>
    </>
  );
}

function ChangedLede({ stored, file, locale }: { stored: Lineup; file: Lineup; locale: string }) {
  const t = useT();
  const list = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' });
  const names = differingFields(stored, file).map((id) => t(FIELD_LABEL[id]));
  if (JSON.stringify(stored.imageUrls ?? []) !== JSON.stringify(file.imageUrls ?? [])) {
    names.push(t('admin.field.photos'));
  }
  return (
    <Text path="admin.q.updateLede" values={{ count: names.length, fields: list.format(names) }} />
  );
}

interface Props {
  row: Row;
  review: Review;
  placing: PointName | null;
  onPlacing: (name: PointName | null) => void;
}

export function Question({ row, review, placing, onPlacing }: Props) {
  const locale = useLocale();
  const { item } = row;
  const { dispatch } = review;
  const kind = kindOf(row);
  const choose = (choice: Choice) => dispatch({ type: 'choose', id: item.id, choice });
  const edit = (next: Lineup, fields: readonly FieldId[]) =>
    dispatch({ type: 'edit', id: item.id, next: copyFields(item.edited, next, fields), fields });
  const showFix = row.plan.kind !== 'skip' && item.initialProblems.length + row.problems.length > 0;
  const blockedIfAdd = item.status === 'new' && row.problems.length > 0;

  const options =
    kind === 'update'
      ? UPDATE_OPTIONS
      : kind === 'duplicate'
        ? DUPLICATE_OPTIONS
        : errorOptions(blockedIfAdd);
  const pill = pillOf(kind, row.problems.length);

  return (
    <div className="flex flex-col gap-1.5">
      <Pill tone={pill.tone}>
        <Text path={pill.label} />
      </Pill>
      <Heading row={row} count={row.problems.length} />
      {showFix ? (
        <FixSteps
          initial={item.initialProblems}
          problems={row.problems}
          lineup={row.plan.lineup}
          placing={placing}
          onPlacing={onPlacing}
          onTitle={(title) => edit({ ...item.edited, title }, ['title'])}
          onDropPhoto={(ref) => {
            const index = (item.edited.imageUrls ?? []).indexOf(ref);
            if (index >= 0) dispatch({ type: 'dropPhoto', id: item.id, index });
          }}
        />
      ) : null}
      {row.clash.length > 0 ? (
        <p
          role="alert"
          className="mt-3 rounded-chip border border-[color-mix(in_srgb,var(--status-invalid)_40%,transparent)] bg-[color-mix(in_srgb,var(--status-invalid)_7%,transparent)] p-3 text-13 text-ink"
        >
          <Text
            path="admin.q.clash"
            values={{
              others: new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(
                row.clash,
              ),
            }}
          />
        </p>
      ) : null}
      <Options
        label="admin.q.optionsLabel"
        options={options}
        value={item.choice}
        onChange={choose}
      />
      {item.choice === 'merge' && item.stored !== null ? (
        <>
          <MergeTable
            stored={item.stored}
            file={item.edited}
            picks={item.picks}
            onPick={(field, side) => dispatch({ type: 'pick', id: item.id, field, side })}
            onPickAll={(side) => dispatch({ type: 'pickAll', id: item.id, side })}
          />
          <PhotoMerge
            item={{ ...item, stored: item.stored }}
            photoBase={review.state.photoBase}
            sizes={review.sizes}
            images={review.images}
            onKeep={(tile, keep) => dispatch({ type: 'keep', id: item.id, tile, keep })}
            onOrder={(order) => dispatch({ type: 'order', id: item.id, order })}
          />
        </>
      ) : null}
    </div>
  );
}

/** The colour a question is shown in, on its pill and on the map alike. */
export function questionTone(row: Row): 'update' | 'duplicate' | 'invalid' | 'new' {
  return pillOf(kindOf(row), row.problems.length).tone;
}

function pillOf(
  kind: Kind,
  problems: number,
): { tone: 'update' | 'duplicate' | 'invalid' | 'new'; label: TranslationKey } {
  if (kind === 'update') return { tone: 'update', label: 'admin.q.pillUpdate' };
  if (kind === 'duplicate') return { tone: 'duplicate', label: 'admin.q.pillDuplicate' };
  return problems > 0
    ? { tone: 'invalid', label: 'admin.q.pillFix' }
    : { tone: 'new', label: 'admin.q.pillFixed' };
}
