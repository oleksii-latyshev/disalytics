import {
  isThrownUtilityKind,
  LINEUP_TAGS,
  type MovementKey,
  THROWN_UTILITY_KINDS,
  toggledLineupTag,
  UTILITY_NAMES,
} from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { MAP_IDS } from '@disa/map-data';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@disa/ui';
import type { LineupFormValues } from '../helpers/lineup-form-model';
import { LineupCalloutField } from './LineupCalloutField';

const ALL_MOVEMENT_KEYS: readonly MovementKey[] = [
  'W',
  'A',
  'S',
  'D',
  'Shift',
  'Ctrl',
  'Jump',
  'Stand',
];
const ALL_THROW_TYPES = ['stand', 'jump', 'run', 'crouch', 'unknown'] as const;

type UpdateValue = <K extends keyof LineupFormValues>(key: K, value: LineupFormValues[K]) => void;

export function LineupBasicFields({
  values,
  updateValue,
  updateMap,
  toggleMovementKey,
}: {
  readonly values: LineupFormValues;
  readonly updateValue: UpdateValue;
  readonly updateMap: (value?: string | null) => void;
  readonly toggleMovementKey: (key: MovementKey) => void;
}) {
  const t = useT();
  return (
    <>
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="lineup-title" className="label-dense text-ink-dim">
          <Text path="library.lineups.form.title" /> *
        </label>
        <Input
          id="lineup-title"
          type="text"
          required
          value={values.title}
          onChange={(e) => updateValue('title', e.target.value)}
          placeholder={t('library.lineups.form.titlePlaceholder')}
        />
      </div>

      {/* Map, Side, Kind */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lineup-map" className="label-dense text-ink-dim">
            <Text path="library.lineups.form.map" />
          </label>
          <Select value={values.map} onValueChange={updateMap}>
            <SelectTrigger id="lineup-map" className="h-8 bg-surface-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAP_IDS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="label-dense text-ink-dim">
            <Text path="library.lineups.form.side" />
          </span>
          <div className="flex h-8 items-center rounded-card border border-line bg-surface-1 p-0.5">
            {(['CT', 'T', 'BOTH'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => updateValue('side', s)}
                className={`flex-1 rounded-chip py-1 text-center font-mono text-11 font-medium transition-colors ${
                  values.side === s ? 'bg-surface-3 text-ink' : 'text-ink-dim hover:text-ink'
                }`}
              >
                {s === 'BOTH' ? <Text path="library.lineups.bothSides" /> : s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="lineup-kind" className="label-dense text-ink-dim">
            <Text path="library.lineups.form.kind" />
          </label>
          <Select
            value={values.kind}
            onValueChange={(val) => updateValue('kind', isThrownUtilityKind(val) ? val : 'smoke')}
          >
            <SelectTrigger id="lineup-kind" className="h-8 bg-surface-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THROWN_UTILITY_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {UTILITY_NAMES[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Target Callout */}
      <LineupCalloutField
        map={values.map}
        value={values.targetCallout}
        onChange={(val) => updateValue('targetCallout', val)}
      />

      {/* Throw type & Movement keys */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1.5">
          <span className="label-dense text-ink-dim">
            <Text path="library.lineups.form.throwType" />
          </span>
          <div className="flex flex-wrap items-center gap-1">
            {ALL_THROW_TYPES.map((tt) => (
              <button
                key={tt}
                type="button"
                onClick={() => updateValue('throwType', tt)}
                className={`h-7 rounded-chip border px-2.5 text-11 font-medium transition-colors ${
                  values.throwType === tt
                    ? 'border-line bg-surface-3 text-ink'
                    : 'border-transparent bg-surface-1 text-ink-dim hover:text-ink'
                }`}
              >
                <Text path={`review.maps.throw.types.${tt}`} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="label-dense text-ink-dim">
            <Text path="library.lineups.form.movementKeys" />
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {ALL_MOVEMENT_KEYS.map((k) => {
              const isSelected = values.movementKeys.includes(k);
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleMovementKey(k)}
                  className={`flex h-7 items-center gap-1 rounded-chip border px-2 font-mono text-11 transition-colors ${
                    isSelected
                      ? 'border-line bg-surface-3 font-medium text-ink'
                      : 'border-transparent bg-surface-1 text-ink-dim hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  <span>{k}</span>
                  {isSelected && <span className="text-10 text-ink-dim">×</span>}
                </button>
              );
            })}
          </div>
        </div>
        <fieldset className="flex flex-col gap-1.5 border-0 p-0">
          <legend className="label-dense text-ink-dim">
            <Text path="library.lineups.form.mouseButtons" />
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {(['left', 'right'] as const).map((button) => (
              <button
                key={button}
                type="button"
                aria-pressed={values.mouseButtons.includes(button)}
                onClick={() =>
                  updateValue(
                    'mouseButtons',
                    values.mouseButtons.includes(button)
                      ? values.mouseButtons.filter((item) => item !== button)
                      : [...values.mouseButtons, button],
                  )
                }
                className={`rounded-chip border px-3 py-1.5 text-11 ${
                  values.mouseButtons.includes(button)
                    ? 'border-line bg-surface-3 text-ink'
                    : 'border-transparent bg-surface-1 text-ink-dim hover:text-ink'
                }`}
              >
                <Text path={`library.lineups.form.mouse.${button}`} />
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lineup-movement-instructions" className="label-dense text-ink-dim">
            <Text path="library.lineups.form.movementInstructions" />
          </label>
          <input
            id="lineup-movement-instructions"
            type="text"
            value={values.movementInstructions}
            onChange={(event) => updateValue('movementInstructions', event.target.value)}
            placeholder={t('library.lineups.form.movementInstructionsPlaceholder')}
            className="h-8 rounded-card border border-line bg-surface-1 px-3 text-12 text-ink placeholder:text-ink-dim"
          />
        </div>
      </div>

      {/* Tags */}
      <fieldset className="flex flex-col gap-1.5 border-0 p-0">
        <legend className="label-dense text-ink-dim">
          <Text path="library.lineups.form.tags" />
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {LINEUP_TAGS.map((tag) => {
            const isOn = values.tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={isOn}
                onClick={() => updateValue('tags', toggledLineupTag(values.tags, tag))}
                className={`rounded-chip border px-3 py-1.5 text-11 ${
                  isOn
                    ? 'border-line bg-surface-3 text-ink'
                    : 'border-transparent bg-surface-1 text-ink-dim hover:text-ink'
                }`}
              >
                <Text path={`library.lineups.tags.${tag}`} />
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Author */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lineup-author-name" className="label-dense text-ink-dim">
            <Text path="library.lineups.form.authorName" />
          </label>
          <Input
            id="lineup-author-name"
            type="text"
            value={values.authorName}
            onChange={(e) => updateValue('authorName', e.target.value)}
            placeholder={t('library.lineups.form.authorNamePlaceholder')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="lineup-author-url" className="label-dense text-ink-dim">
            <Text path="library.lineups.form.authorUrl" />
          </label>
          <input
            id="lineup-author-url"
            type="url"
            value={values.authorUrl}
            onChange={(e) => updateValue('authorUrl', e.target.value)}
            placeholder="https://steamcommunity.com/id/..."
            className="h-8 rounded-card border border-line bg-surface-1 px-3 text-12 text-ink placeholder:text-ink-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="lineup-notes" className="label-dense text-ink-dim">
          <Text path="library.lineups.form.notes" />
        </label>
        <textarea
          id="lineup-notes"
          rows={2}
          value={values.notes}
          onChange={(e) => updateValue('notes', e.target.value)}
          placeholder={t('library.lineups.form.notesPlaceholder')}
          className="rounded-card border border-line bg-surface-1 p-2.5 text-12 text-ink placeholder:text-ink-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
        />
      </div>

      {/* Media URL */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="lineup-media" className="label-dense text-ink-dim">
          <Text path="library.lineups.form.mediaUrl" />
        </label>
        <input
          id="lineup-media"
          type="url"
          value={values.mediaUrl}
          onChange={(e) => updateValue('mediaUrl', e.target.value)}
          placeholder="https://..."
          className="h-8 rounded-card border border-line bg-surface-1 px-3 text-12 text-ink placeholder:text-ink-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
        />
      </div>
    </>
  );
}
