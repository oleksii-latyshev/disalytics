import {
  TACTIC_ROUNDS,
  TACTIC_SIDES,
  type Tactic,
  type TacticRound,
  type TacticSide,
} from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { MAP_IDS } from '@disa/map-data';
import {
  Button,
  cn,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@disa/ui';
import { ArrowLeft, Check, ChevronDown, Redo2, Save, Undo2 } from 'lucide-react';
import { useId, useState } from 'react';
import { calledOnRounds } from '../helpers/tactic-names';

interface TacticEditorHeaderProps {
  readonly tactic: Tactic;
  readonly isDirty: boolean;
  readonly onBack?: (() => void) | undefined;
  readonly onUpdateTitle: (title: string) => void;
  readonly onUpdateDescription: (description: string) => void;
  readonly onChangeMap: (map: string) => void;
  readonly onChangeSide: (side: TacticSide) => void;
  readonly onToggleRound: (round: TacticRound) => void;
  readonly onTransfer: () => void;
  readonly onSave: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}

function TacticDetails({
  tactic,
  onUpdateDescription,
  onChangeMap,
  onChangeSide,
  onToggleRound,
}: Pick<
  TacticEditorHeaderProps,
  'tactic' | 'onUpdateDescription' | 'onChangeMap' | 'onChangeSide' | 'onToggleRound'
>) {
  const t = useT();
  const maps = MAP_IDS.some((map) => map === tactic.map) ? MAP_IDS : [tactic.map, ...MAP_IDS];
  const rounds = tactic.rounds ?? [];

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 pb-2 lg:px-4">
      <Select value={tactic.map} onValueChange={(map) => map !== null && onChangeMap(map)}>
        <SelectTrigger aria-label={t('library.tactics.editor.map')} className="w-40 font-mono">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {maps.map((map) => (
            <SelectItem key={map} value={map}>
              {map}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <fieldset
        aria-label={t('library.tactics.editor.side')}
        className="m-0 flex items-center gap-1 border-none p-0"
      >
        {TACTIC_SIDES.map((side) => (
          <Button
            key={side}
            variant={tactic.side === side ? 'secondary' : 'ghost'}
            aria-pressed={tactic.side === side}
            onClick={() => onChangeSide(side)}
            className={cn(
              'font-mono',
              tactic.side === side ? (side === 'CT' ? 'text-ct' : 'text-t') : 'text-ink-dim',
            )}
          >
            {side}
          </Button>
        ))}
      </fieldset>

      <fieldset
        aria-label={t('library.tactics.editor.rounds')}
        title={t('library.tactics.editor.roundsHint')}
        className="m-0 flex items-center gap-1 border-none p-0"
      >
        <legend className="sr-only">{t('library.tactics.editor.rounds')}</legend>
        <span className="mr-1 text-12 text-ink-dim">{t('library.tactics.editor.rounds')}</span>
        {TACTIC_ROUNDS.map((round) => {
          const isOn = rounds.includes(round);
          return (
            <Button
              key={round}
              variant={isOn ? 'secondary' : 'ghost'}
              aria-pressed={isOn}
              onClick={() => onToggleRound(round)}
              className={cn('font-mono', isOn ? 'text-ink' : 'text-ink-dim')}
            >
              {round}
            </Button>
          );
        })}
      </fieldset>

      <Input
        type="text"
        value={tactic.description ?? ''}
        onChange={(event) => onUpdateDescription(event.target.value)}
        aria-label={t('library.tactics.editor.description')}
        placeholder={t('library.tactics.editor.descriptionPlaceholder')}
        className="min-w-40 flex-1"
      />
    </div>
  );
}

/** The tactic's name and its `map · side · called on` line, whose disclosure holds the setup. */
export function TacticEditorHeader({
  tactic,
  isDirty,
  onBack,
  onTransfer,
  onSave,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  ...details
}: TacticEditorHeaderProps) {
  const t = useT();
  const detailsId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const called = calledOnRounds(tactic.rounds);
  const subtitle =
    called === undefined
      ? t('library.tactics.editor.subtitleAny', { map: tactic.map, side: tactic.side })
      : t('library.tactics.editor.subtitle', {
          map: tactic.map,
          side: tactic.side,
          rounds: called,
        });
  const saveLabel = isDirty ? t('library.tactics.editor.save') : t('library.tactics.editor.saved');

  return (
    <header className="order-1 flex flex-col lg:order-none lg:col-span-3 lg:row-start-1">
      <div className="flex items-center gap-2 px-3 py-2.5 lg:gap-3 lg:px-4">
        {onBack !== undefined && (
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={onBack}
            title={t('library.tactics.editor.exit')}
            aria-label={t('library.tactics.editor.exit')}
            className="shrink-0 text-ink-dim hover:text-ink"
          >
            <ArrowLeft />
          </Button>
        )}

        <div className="flex min-w-0 flex-1 flex-col lg:flex-none">
          <input
            type="text"
            value={tactic.title}
            onChange={(event) => details.onUpdateTitle(event.target.value)}
            aria-label={t('library.tactics.editor.tacticTitle')}
            placeholder={t('library.tactics.untitled')}
            className="w-full min-w-0 rounded-chip bg-transparent text-16 font-semibold text-ink placeholder:text-ink-faint hover:bg-hover lg:w-72 lg:text-20"
          />
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls={detailsId}
            title={
              isOpen ? t('library.tactics.editor.detailsHide') : t('library.tactics.editor.details')
            }
            className="flex max-w-full items-center gap-1 self-start truncate rounded-chip font-mono text-11 text-ink-dim hover:text-ink"
          >
            <span className="truncate">{subtitle}</span>
            <ChevronDown
              aria-hidden="true"
              className={cn('size-3 shrink-0 transition-transform', isOpen && 'rotate-180')}
            />
          </button>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label={t('library.tactics.board.header.undo')}
            title={t('library.tactics.board.header.undo')}
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label={t('library.tactics.board.header.redo')}
            title={t('library.tactics.board.header.redo')}
          >
            <Redo2 />
          </Button>
          <Button variant="outline" size="lg" onClick={onTransfer}>
            {t('library.tactics.transfer.open')}
          </Button>
          <Button
            variant={isDirty ? 'primary' : 'secondary'}
            size="lg"
            onClick={onSave}
            aria-label={saveLabel}
            title={isDirty ? t('library.tactics.editor.unsaved') : saveLabel}
            className="max-sm:size-(--height-control-lg) max-sm:p-0"
          >
            {isDirty ? <Save /> : <Check />}
            <span className="max-sm:hidden">{saveLabel}</span>
          </Button>
        </div>
      </div>

      <div id={detailsId} hidden={!isOpen}>
        {isOpen && <TacticDetails tactic={tactic} {...details} />}
      </div>
    </header>
  );
}
