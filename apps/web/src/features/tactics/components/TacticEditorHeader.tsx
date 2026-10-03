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
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@disa/ui';
import { ArrowLeft, Check, Save } from 'lucide-react';

interface TacticEditorHeaderProps {
  readonly tactic: Tactic;
  readonly isSaved: boolean;
  readonly onBack?: (() => void) | undefined;
  readonly onUpdateTitle: (title: string) => void;
  readonly onUpdateDescription: (description: string) => void;
  readonly onChangeMap: (map: string) => void;
  readonly onChangeSide: (side: TacticSide) => void;
  readonly onToggleRound: (round: TacticRound) => void;
  readonly onSave: () => void;
}

export function TacticEditorHeader({
  tactic,
  isSaved,
  onBack,
  onUpdateTitle,
  onUpdateDescription,
  onChangeMap,
  onChangeSide,
  onToggleRound,
  onSave,
}: TacticEditorHeaderProps) {
  const t = useT();
  const maps = MAP_IDS.some((map) => map === tactic.map) ? MAP_IDS : [tactic.map, ...MAP_IDS];
  const rounds = tactic.rounds ?? [];

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 [border-block-end:1px_solid_var(--color-line)] px-4 py-2">
      {onBack !== undefined && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          title={t('library.tactics.editor.exit')}
          aria-label={t('library.tactics.editor.exit')}
          className="text-ink-dim hover:text-ink"
        >
          <ArrowLeft />
        </Button>
      )}

      <Input
        type="text"
        value={tactic.title}
        onChange={(e) => onUpdateTitle(e.target.value)}
        aria-label={t('library.tactics.editor.tacticTitle')}
        placeholder={t('library.tactics.untitled')}
        className="w-56 font-semibold"
      />

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
            className={`font-mono ${tactic.side === side ? (side === 'CT' ? 'text-ct' : 'text-t') : 'text-ink-dim'}`}
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
              className={`font-mono ${isOn ? 'text-ink' : 'text-ink-dim'}`}
            >
              {round}
            </Button>
          );
        })}
      </fieldset>

      <Input
        type="text"
        value={tactic.description ?? ''}
        onChange={(e) => onUpdateDescription(e.target.value)}
        aria-label={t('library.tactics.editor.description')}
        placeholder={t('library.tactics.editor.descriptionPlaceholder')}
        className="min-w-40 flex-1"
      />

      <Button
        variant={isSaved ? 'outline' : 'primary'}
        onClick={onSave}
        aria-label={isSaved ? t('library.tactics.editor.saved') : t('library.tactics.editor.save')}
        className="ml-auto"
      >
        {isSaved ? <Check /> : <Save />}
        <span>
          {isSaved ? t('library.tactics.editor.saved') : t('library.tactics.editor.save')}
        </span>
      </Button>
    </header>
  );
}
