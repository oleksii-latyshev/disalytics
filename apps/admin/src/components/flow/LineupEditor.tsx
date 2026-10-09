import { MAX_TITLE_LENGTH } from '@disa/admin-contract';
import {
  isHttpsUrl,
  LINEUP_TAGS,
  type Lineup,
  type LineupTag,
  toggledLineupTag,
  type WorldPoint,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { cn, Input, inputVariants } from '@disa/ui';
import { useId, useState } from 'react';
import type { FieldId } from '../../helpers/fields';
import type { PointName } from '../map/MapMarks';
import { MapCard } from './MapCard';
import type { Tone } from './status';

export type Edit = (next: Lineup, fields: readonly FieldId[]) => void;

interface Props {
  lineup: Lineup;
  onEdit: Edit;
  map: string;
  /** The lineups already on the site, drawn faint behind the one being edited. */
  onSite: readonly Lineup[];
  counterpart: Lineup | null;
  tone: Tone;
  invalid: readonly PointName[];
}

function withText(lineup: Lineup, key: 'targetCallout' | 'notes', text: string): Lineup {
  const { [key]: _previous, ...rest } = lineup;
  return text.trim() === '' ? rest : { ...rest, [key]: text };
}

function withAuthor(lineup: Lineup, name: string, url: string): Lineup {
  const { author: _previous, ...rest } = lineup;
  if (name.trim() === '') return rest;
  return { ...rest, author: isHttpsUrl(url) ? { name, url } : { name } };
}

function withTags(lineup: Lineup, tags: readonly LineupTag[]): Lineup {
  const { tags: _previous, ...rest } = lineup;
  return tags.length === 0 ? rest : { ...rest, tags };
}

function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: React.ReactNode;
  htmlFor: string;
}) {
  return (
    <label htmlFor={htmlFor} className="flex min-w-0 flex-col gap-1 text-13 text-ink-dim">
      {label}
      {children}
    </label>
  );
}

/** Title, callout, notes, tags, author and the two points of one lineup, all editable in place. */
export function LineupEditor({ lineup, onEdit, map, onSite, counterpart, tone, invalid }: Props) {
  const t = useT();
  const id = useId();
  const [url, setUrl] = useState(lineup.author?.url ?? '');
  const tags = lineup.tags ?? [];
  const move = (name: PointName, point: WorldPoint) => onEdit({ ...lineup, [name]: point }, [name]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] items-start gap-4 max-lg:grid-cols-1">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <Field label={t('admin.edit.title')} htmlFor={`${id}-title`}>
          <Input
            id={`${id}-title`}
            value={lineup.title}
            maxLength={MAX_TITLE_LENGTH * 2}
            aria-invalid={lineup.title.trim() === ''}
            onChange={(event) => onEdit({ ...lineup, title: event.currentTarget.value }, ['title'])}
          />
        </Field>
        <Field label={t('admin.edit.callout')} htmlFor={`${id}-callout`}>
          <Input
            id={`${id}-callout`}
            value={lineup.targetCallout ?? ''}
            onChange={(event) =>
              onEdit(withText(lineup, 'targetCallout', event.currentTarget.value), ['callout'])
            }
          />
        </Field>
        <div className="col-span-full">
          <Field label={t('admin.edit.notes')} htmlFor={`${id}-notes`}>
            <textarea
              id={`${id}-notes`}
              value={lineup.notes ?? ''}
              rows={3}
              onChange={(event) =>
                onEdit(withText(lineup, 'notes', event.currentTarget.value), ['notes'])
              }
              className={cn(inputVariants(), 'h-auto min-h-16 py-2')}
            />
          </Field>
        </div>
        <fieldset className="m-0 flex min-w-0 flex-col gap-1 border-0 p-0">
          <legend className="mb-1 text-13 text-ink-dim">
            <Text path="admin.edit.tags" />
          </legend>
          <div className="flex gap-1.5">
            {LINEUP_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={tags.includes(tag)}
                onClick={() => onEdit(withTags(lineup, toggledLineupTag(tags, tag)), ['tags'])}
                className={cn(
                  'h-control rounded-chip border px-3 text-13 transition-[border-color,background-color] duration-(--duration-micro)',
                  tags.includes(tag)
                    ? 'border-ink bg-selected text-ink'
                    : 'border-line text-ink-dim hover:border-line-strong',
                )}
              >
                <Text
                  path={tag === 'meta' ? 'library.lineups.tags.meta' : 'library.lineups.tags.old'}
                />
              </button>
            ))}
          </div>
        </fieldset>
        <Field label={t('admin.edit.author')} htmlFor={`${id}-author`}>
          <Input
            id={`${id}-author`}
            value={lineup.author?.name ?? ''}
            onChange={(event) =>
              onEdit(withAuthor(lineup, event.currentTarget.value, url), ['author'])
            }
          />
        </Field>
        <Field label={t('admin.edit.authorUrl')} htmlFor={`${id}-url`}>
          <Input
            id={`${id}-url`}
            type="url"
            value={url}
            aria-invalid={url !== '' && !isHttpsUrl(url)}
            placeholder="https://"
            onChange={(event) => {
              setUrl(event.currentTarget.value);
              onEdit(withAuthor(lineup, lineup.author?.name ?? '', event.currentTarget.value), [
                'author',
              ]);
            }}
          />
        </Field>
      </div>
      <MapCard
        map={map}
        stored={onSite.filter((entry) => entry.id !== counterpart?.id)}
        counterpart={counterpart}
        current={lineup}
        tone={tone}
        invalid={invalid}
        placing={null}
        onMove={move}
      />
    </div>
  );
}
