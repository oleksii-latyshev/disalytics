import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import {
  Bomb,
  Cloud,
  Eraser,
  Flame,
  MousePointer,
  Pencil,
  Redo2,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import { COACH_PENCIL_COLORS, type CoachPencilColor, type CoachTool } from '../helpers/coach-types';

interface Props {
  readonly tool: CoachTool;
  readonly colorName: CoachPencilColor;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onSelectTool: (tool: CoachTool) => void;
  readonly onSelectColor: (color: CoachPencilColor) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onClear: () => void;
  readonly onExit: () => void;
}

const COLOR_CSS_VAR: Record<CoachPencilColor, string> = {
  objective: 'var(--color-objective)',
  ct: 'var(--color-ct)',
  t: 'var(--color-t)',
  damage: 'var(--color-damage)',
  ink: 'var(--color-ink)',
};

function handleModifierShortcut(
  event: KeyboardEvent,
  onUndo: () => void,
  onRedo: () => void,
): boolean {
  const isModifier = event.ctrlKey || event.metaKey;
  if (!isModifier) return false;

  const key = event.key.toLowerCase();
  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      onRedo();
    } else {
      onUndo();
    }
    return true;
  }

  if (key === 'y') {
    event.preventDefault();
    onRedo();
    return true;
  }

  return false;
}

const TOOL_KEYS: Record<string, CoachTool> = {
  p: 'pencil',
  e: 'eraser',
  m: 'move',
  v: 'move',
  s: 'smoke',
  o: 'molotov',
  f: 'flash',
  h: 'he',
};

const COLOR_KEYS: Record<string, CoachPencilColor> = {
  '1': 'objective',
  '2': 'ct',
  '3': 't',
  '4': 'damage',
  '5': 'ink',
};

function handleToolShortcut(
  key: string,
  onSelectTool: (tool: CoachTool) => void,
  onSelectColor: (color: CoachPencilColor) => void,
): void {
  const tool = TOOL_KEYS[key];
  if (tool !== undefined) {
    onSelectTool(tool);
    return;
  }

  const color = COLOR_KEYS[key];
  if (color !== undefined) {
    onSelectColor(color);
  }
}

export function CoachToolbar({
  tool,
  colorName,
  canUndo,
  canRedo,
  onSelectTool,
  onSelectColor,
  onUndo,
  onRedo,
  onClear,
  onExit,
}: Props) {
  const t = useT();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'Escape' || event.key === 'c' || event.key === 'C') {
        event.preventDefault();
        onExit();
        return;
      }

      if (handleModifierShortcut(event, onUndo, onRedo)) return;

      if (event.key === 'Delete' || event.key === 'Backspace' || event.key.toLowerCase() === 'x') {
        event.preventDefault();
        onClear();
        return;
      }

      handleToolShortcut(event.key.toLowerCase(), onSelectTool, onSelectColor);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit, onUndo, onRedo, onClear, onSelectTool, onSelectColor]);

  return (
    <div
      role="toolbar"
      aria-label={t('radar.coach.enter')}
      className="surface-card flex max-w-[calc(100cqi-2rem)] flex-wrap items-center gap-1 rounded-float border border-line bg-surface-1 p-1 shadow-lg"
    >
      {/* Tool buttons: Move, Pencil, Eraser */}
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant={tool === 'move' ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={t('radar.coach.tools.move')}
          aria-pressed={tool === 'move'}
          onClick={() => onSelectTool('move')}
        >
          <MousePointer className="size-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant={tool === 'pencil' ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={t('radar.coach.tools.pencil')}
          aria-pressed={tool === 'pencil'}
          onClick={() => onSelectTool('pencil')}
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant={tool === 'eraser' ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={t('radar.coach.tools.eraser')}
          aria-pressed={tool === 'eraser'}
          onClick={() => onSelectTool('eraser')}
        >
          <Eraser className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="mx-0.5 h-5 w-px self-center bg-line" />

      {/* Pencil Colors */}
      <fieldset className="m-0 flex items-center gap-1 border-0 p-0 px-1" aria-label="Color">
        {COACH_PENCIL_COLORS.map((c) => {
          const isSelected = colorName === c;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={isSelected}
              aria-label={t(`radar.coach.colors.${c}`)}
              className={`size-5 rounded-full transition-transform ${
                isSelected
                  ? 'scale-110 ring-2 ring-primary ring-offset-2 ring-offset-surface-1'
                  : 'hover:scale-105'
              }`}
              style={{ backgroundColor: COLOR_CSS_VAR[c] }}
              onClick={() => {
                onSelectColor(c);
                if (tool !== 'pencil') onSelectTool('pencil');
              }}
            />
          );
        })}
      </fieldset>

      <div className="mx-0.5 h-5 w-px self-center bg-line" />

      {/* Utility stamps */}
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant={tool === 'smoke' ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={t('radar.coach.tools.smoke')}
          aria-pressed={tool === 'smoke'}
          onClick={() => onSelectTool('smoke')}
        >
          <Cloud className="size-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant={tool === 'molotov' ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={t('radar.coach.tools.molotov')}
          aria-pressed={tool === 'molotov'}
          onClick={() => onSelectTool('molotov')}
        >
          <Flame className="size-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant={tool === 'flash' ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={t('radar.coach.tools.flash')}
          aria-pressed={tool === 'flash'}
          onClick={() => onSelectTool('flash')}
        >
          <Sparkles className="size-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant={tool === 'he' ? 'secondary' : 'ghost'}
          size="icon"
          aria-label={t('radar.coach.tools.he')}
          aria-pressed={tool === 'he'}
          onClick={() => onSelectTool('he')}
        >
          <Bomb className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="mx-0.5 h-5 w-px self-center bg-line" />

      {/* History & Actions */}
      <div className="flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canUndo}
          aria-label={t('radar.coach.tools.undo')}
          onClick={onUndo}
        >
          <Undo2 className="size-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!canRedo}
          aria-label={t('radar.coach.tools.redo')}
          onClick={onRedo}
        >
          <Redo2 className="size-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('radar.coach.tools.clear')}
          onClick={onClear}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('radar.coach.exit')}
          onClick={onExit}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
