import { THROWN_UTILITY_KINDS } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, Input } from '@disa/ui';
import { useId } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { LINEUP_KIND_NAMES, LINEUP_KIND_ORDER } from '@/core/lineup-catalog';
import {
  ADD_THROW_TYPES,
  type AddDraft,
  type AddSide,
  type AddStep,
  addStep,
  titleOf,
} from '../helpers/lineup-add';
import type { PreparedImage } from '../helpers/prepared-image';
import { useAddPhotos } from '../hooks/use-add-photos';
import { LineupPhotoDrop } from './LineupPhotoDrop';

const CHIP =
  'flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-chip border px-2.5 text-12 transition-colors duration-(--duration-micro) ease-out';

const SIDE_INK: Readonly<Record<AddSide, string>> = { T: 'text-t', CT: 'text-ct' };

const STEPS = ['land', 'origin', 'details'] as const satisfies readonly AddStep[];

interface Props {
  map: string;
  draft: AddDraft;
  isSaving: boolean;
  hasFailed: boolean;
  onDraft: (patch: Partial<AddDraft>) => void;
  /** Takes a placed point back to place it again. */
  onRedo: (point: 'landing' | 'origin') => void;
  onSave: (photos: readonly PreparedImage[]) => void;
  onCancel: () => void;
}

/**
 * The right column while a lineup is added: the three steps and where the flow is, the kind and
 * side, and — once both points are on the map — what to say about it.
 */
export function LineupAddPanel(props: Props) {
  const { map, draft, isSaving, hasFailed, onDraft } = props;
  const t = useT();
  const photos = useAddPhotos();
  const nameId = useId();
  const aimId = useId();
  const step = addStep(draft);
  const kinds = LINEUP_KIND_ORDER.filter((kind) => THROWN_UTILITY_KINDS.includes(kind));
  const canRedo = (at: AddStep) =>
    (at === 'land' && draft.target === null && draft.landing !== null) ||
    (at === 'origin' && draft.origin !== null);

  return (
    <div className="lineup-rise flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <h2 className="font-semibold text-16 text-ink">
          <Text
            path={
              draft.target === null
                ? 'library.lineups.addFlow.title'
                : 'library.lineups.addFlow.titleAnother'
            }
          />
        </h2>

        <ol className="flex list-none flex-col gap-2">
          {STEPS.map((at, index) => {
            const isCurrent = at === step;
            const isDone = STEPS.indexOf(step) > index;

            return (
              <li
                key={at}
                className={`flex items-center gap-2.5 rounded-card border px-2.5 py-2 ${isCurrent ? 'border-line-strong bg-selected' : 'border-transparent'} ${isCurrent || isDone ? '' : 'opacity-50'}`}
              >
                <span
                  className={`numeric grid size-6 shrink-0 place-items-center rounded-full font-semibold text-11 ${isCurrent ? 'bg-ink text-surface-0' : 'bg-surface-3 text-ink'}`}
                >
                  {isDone ? '✓' : index + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="font-semibold text-13 text-ink">
                    <Text path={`library.lineups.addFlow.step.${at}.title`} />
                  </span>
                  <span className="text-12 text-ink-dim">
                    <Text path={`library.lineups.addFlow.step.${at}.hint`} />
                  </span>
                </span>
                {isDone && canRedo(at) && (
                  <Button
                    variant="ghost"
                    onClick={() => props.onRedo(at === 'land' ? 'landing' : 'origin')}
                    className="h-7 px-2 text-11"
                  >
                    <Text path="library.lineups.addFlow.redo" />
                  </Button>
                )}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-2">
          <h3 className="label-dense text-ink-dim">
            <Text path="library.lineups.addFlow.kindSide" />
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {kinds.map((kind) => {
              const isOn = draft.kind === kind;

              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={isOn}
                  disabled={draft.target !== null}
                  onClick={() => onDraft({ kind })}
                  className={`${CHIP} disabled:cursor-not-allowed ${isOn ? 'border-line-strong bg-selected font-semibold text-ink' : 'border-line text-ink-dim hover:text-ink'}`}
                >
                  <UtilityGlyph kind={kind} size="control" />
                  {LINEUP_KIND_NAMES[kind]}
                </button>
              );
            })}
          </div>
          <fieldset className="grid grid-cols-2 gap-0.5 rounded-chip bg-surface-2 p-0.5">
            <legend className="sr-only">
              <Text path="library.lineups.side" />
            </legend>
            {(['T', 'CT'] as const satisfies readonly AddSide[]).map((side) => (
              <button
                key={side}
                type="button"
                aria-pressed={draft.side === side}
                onClick={() => onDraft({ side })}
                className={`h-7 cursor-pointer rounded-chip text-12 ${draft.side === side ? 'bg-selected font-semibold' : 'text-ink-dim hover:text-ink'} ${draft.side === side ? SIDE_INK[side] : ''}`}
              >
                <Text
                  path={
                    side === 'T'
                      ? 'library.lineups.addFlow.sideT'
                      : 'library.lineups.addFlow.sideCT'
                  }
                />
              </button>
            ))}
          </fieldset>
        </div>

        {step === 'details' && (
          <div className="lineup-rise flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={nameId} className="text-12 text-ink-dim">
                <Text path="library.lineups.addFlow.name" />
              </label>
              <Input
                id={nameId}
                type="text"
                value={titleOf(map, draft)}
                onChange={(event) => onDraft({ title: event.target.value })}
              />
            </div>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-12 text-ink-dim">
                <Text path="library.lineups.addFlow.throwType" />
              </legend>
              <div className="flex flex-wrap gap-1.5">
                {ADD_THROW_TYPES.map((type) => {
                  const isOn = draft.throwType === type;

                  return (
                    <button
                      key={type}
                      type="button"
                      aria-pressed={isOn}
                      onClick={() => onDraft({ throwType: type })}
                      className={`${CHIP} ${isOn ? 'border-line-strong bg-selected font-semibold text-ink' : 'border-line text-ink-dim hover:text-ink'}`}
                    >
                      <Text path={`review.maps.throw.types.${type}`} />
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <label htmlFor={aimId} className="text-12 text-ink-dim">
                <Text path="library.lineups.addFlow.aim" />
              </label>
              <textarea
                id={aimId}
                rows={2}
                value={draft.notes}
                placeholder={t('library.lineups.addFlow.aimPlaceholder')}
                onChange={(event) => onDraft({ notes: event.target.value })}
                className="resize-none rounded-chip border border-line bg-surface-2 p-2.5 text-13 text-ink placeholder:text-ink-dim"
              />
            </div>

            <LineupPhotoDrop
              images={photos.images}
              hasFailed={photos.hasFailed}
              onAdd={photos.add}
              onRemove={photos.remove}
            />

            <p className="text-11 text-ink-faint">
              <Text path="library.lineups.addFlow.later" />
            </p>
          </div>
        )}

        {hasFailed && (
          <p role="alert" className="text-12 text-damage">
            <Text path="library.lineups.form.validation.saveFailed" />
          </p>
        )}
      </div>

      <div className="flex gap-2 [border-block-start:1px_solid_var(--color-line)] px-4 pt-3 pb-4">
        <Button variant="outline" size="lg" onClick={props.onCancel} className="flex-1">
          <Text path="library.lineups.form.cancel" />
        </Button>
        <Button
          size="lg"
          disabled={step !== 'details' || isSaving}
          onClick={() => props.onSave(photos.images)}
          className="flex-1"
        >
          <Text path="library.lineups.addFlow.save" />
        </Button>
      </div>
    </div>
  );
}
