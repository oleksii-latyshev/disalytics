import type { Lineup } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, cn } from '@disa/ui';
import { fieldText } from '../../helpers/field-text';
import {
  FIELD_IDS,
  type FieldId,
  isEmptyField,
  type Picks,
  type Side,
  sameField,
} from '../../helpers/fields';

function Cell({
  text,
  picked,
  same,
  onPick,
}: {
  text: string;
  picked: boolean;
  same: boolean;
  onPick: () => void;
}) {
  const label =
    text === '' ? (
      <span className="text-ink-faint italic">
        <Text path="admin.merge.empty" />
      </span>
    ) : (
      text
    );
  const shape =
    'flex min-w-0 items-start gap-2 rounded-chip border px-2.5 py-2 text-start text-13 [overflow-wrap:anywhere]';
  if (same) {
    return (
      <span className={cn(shape, 'border-line bg-surface-2 text-ink opacity-55')}>
        <span
          aria-hidden="true"
          className="mt-0.5 grid size-4 flex-none place-items-center text-11"
        >
          =
        </span>
        <span>{label}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={onPick}
      className={cn(
        shape,
        'cursor-pointer text-ink transition-[border-color,background-color] duration-(--duration-micro)',
        picked ? 'border-ink bg-selected' : 'border-line bg-surface-2 hover:border-line-strong',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-0.5 grid size-4 flex-none place-items-center rounded-[4px] border-[1.5px] text-11',
          picked ? 'border-ink bg-ink text-surface-0' : 'border-ink-faint',
        )}
      >
        {picked ? '✓' : ''}
      </span>
      <span>{label}</span>
    </button>
  );
}

/** Every field of the two versions side by side; press the one to keep. Equal fields are greyed. */
export function MergeTable({
  stored,
  file,
  picks,
  onPick,
  onPickAll,
}: {
  stored: Lineup;
  file: Lineup;
  picks: Picks;
  onPick: (field: FieldId, side: Side) => void;
  onPickAll: (side: Side) => void;
}) {
  const t = useT();
  const fields = FIELD_IDS.filter((id) => !(isEmptyField(id, stored) && isEmptyField(id, file)));
  return (
    <div className="mt-5 flex flex-col gap-2.5">
      <h3 className="font-semibold text-16 text-ink">
        <Text path="admin.merge.title" />
      </h3>
      <p className="text-13 text-ink-faint">
        <Text path="admin.merge.hint" />
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" onClick={() => onPickAll('file')}>
          <Text path="admin.merge.allFile" />
        </Button>
        <Button variant="outline" onClick={() => onPickAll('stored')}>
          <Text path="admin.merge.allStored" />
        </Button>
      </div>
      <div className="grid grid-cols-[130px_minmax(0,1fr)_minmax(0,1fr)] gap-2 text-11 text-ink-faint uppercase tracking-wider max-sm:hidden">
        <span>
          <Text path="admin.merge.field" />
        </span>
        <span>
          <Text path="admin.merge.onSite" />
        </span>
        <span>
          <Text path="admin.merge.inFile" />
        </span>
      </div>
      {fields.map((id) => {
        const same = sameField(id, stored, file);
        return (
          <div
            key={id}
            className="grid grid-cols-[130px_minmax(0,1fr)_minmax(0,1fr)] gap-2 max-sm:grid-cols-2"
          >
            <span className="pt-2.5 text-13 text-ink-dim max-sm:col-span-2 max-sm:pt-0">
              <Text path={`admin.field.${id}`} />
            </span>
            <Cell
              text={fieldText(id, stored, t)}
              same={same}
              picked={picks[id] === 'stored'}
              onPick={() => onPick(id, 'stored')}
            />
            <Cell
              text={fieldText(id, file, t)}
              same={same}
              picked={picks[id] === 'file'}
              onPick={() => onPick(id, 'file')}
            />
          </div>
        );
      })}
    </div>
  );
}
