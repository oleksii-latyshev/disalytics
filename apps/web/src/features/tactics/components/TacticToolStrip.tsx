import type { UtilityKind } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button, cn } from '@disa/ui';
import { Eraser, MousePointer2, Pencil, Redo2, Trash2, Undo2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import type { TacticTool } from '../hooks/use-tactic-editor';

export interface TacticToolStripProps {
  readonly activeTool: TacticTool;
  readonly pencilColor: string;
  readonly newThrowKind: UtilityKind;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onSelectTool: (tool: TacticTool) => void;
  readonly onSelectColor: (color: string) => void;
  readonly onSelectThrowKind: (kind: UtilityKind) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onClearDrawings: () => void;
}

const PENCIL_COLORS = [
  { id: 'ct', value: 'var(--color-ct)', labelKey: 'library.tactics.tools.colors.ct' },
  { id: 't', value: 'var(--color-t)', labelKey: 'library.tactics.tools.colors.t' },
  {
    id: 'objective',
    value: 'var(--color-objective)',
    labelKey: 'library.tactics.tools.colors.objective',
  },
  { id: 'damage', value: 'var(--color-damage)', labelKey: 'library.tactics.tools.colors.damage' },
  { id: 'ink', value: 'var(--color-ink)', labelKey: 'library.tactics.tools.colors.ink' },
] as const;

const THROW_KINDS = ['smoke', 'flash', 'fire', 'he', 'decoy'] as const;

function Divider() {
  return (
    <span
      aria-hidden="true"
      className="mx-1 h-5 w-px shrink-0 bg-line lg:mx-0 lg:my-1 lg:h-px lg:w-5"
    />
  );
}

interface ToolButtonProps {
  readonly label: string;
  readonly isOn?: boolean | undefined;
  readonly isDisabled?: boolean | undefined;
  readonly onClick: () => void;
  readonly children: ReactNode;
  readonly className?: string | undefined;
}

function ToolButton({ label, isOn, isDisabled, onClick, children, className }: ToolButtonProps) {
  return (
    <Button
      variant={isOn === true ? 'secondary' : 'ghost'}
      size="icon"
      onClick={onClick}
      disabled={isDisabled}
      aria-label={label}
      aria-pressed={isOn}
      title={label}
      className={cn(
        'h-10 w-9 shrink-0 lg:size-8',
        isOn === true ? 'text-ink' : 'text-ink-dim hover:text-ink',
        className,
      )}
    >
      {children}
    </Button>
  );
}

/** The tool palette: the plate's modes, the utility to throw, history, and the pencil's colours. */
export function TacticToolStrip({
  activeTool,
  pencilColor,
  newThrowKind,
  canUndo,
  canRedo,
  onSelectTool,
  onSelectColor,
  onSelectThrowKind,
  onUndo,
  onRedo,
  onClearDrawings,
}: TacticToolStripProps) {
  const t = useT();

  return (
    <div
      role="toolbar"
      aria-label={t('library.tactics.tools.palette')}
      className="order-6 flex items-center gap-0.5 overflow-x-auto bg-surface-1 px-2 pt-1.5 pb-3 [border-block-start:1px_solid_var(--color-line)] lg:z-10 lg:col-start-2 lg:row-start-2 lg:m-2 lg:flex-col lg:self-center lg:justify-self-start lg:overflow-visible lg:rounded-card lg:p-1 lg:[border:1px_solid_var(--color-line)]"
    >
      <ToolButton
        label={t('library.tactics.tools.select')}
        isOn={activeTool === 'select'}
        onClick={() => onSelectTool('select')}
      >
        <MousePointer2 />
      </ToolButton>
      <ToolButton
        label={t('library.tactics.tools.pencil')}
        isOn={activeTool === 'pencil'}
        onClick={() => onSelectTool('pencil')}
      >
        <Pencil />
      </ToolButton>
      <ToolButton
        label={t('library.tactics.tools.eraser')}
        isOn={activeTool === 'eraser'}
        onClick={() => onSelectTool('eraser')}
      >
        <Eraser />
      </ToolButton>

      <Divider />

      {THROW_KINDS.map((kind) => {
        const name = t(`library.tactics.tools.utilityKinds.${kind}`);
        return (
          <ToolButton
            key={kind}
            label={t('library.tactics.tools.utility', { kind: name })}
            isOn={activeTool === 'throw' && newThrowKind === kind}
            onClick={() => {
              onSelectThrowKind(kind);
              onSelectTool('throw');
            }}
          >
            <UtilityGlyph kind={kind} size="control" hasOwnInk={false} />
          </ToolButton>
        );
      })}

      <Divider />

      <ToolButton label={t('library.tactics.tools.undo')} isDisabled={!canUndo} onClick={onUndo}>
        <Undo2 />
      </ToolButton>
      <ToolButton label={t('library.tactics.tools.redo')} isDisabled={!canRedo} onClick={onRedo}>
        <Redo2 />
      </ToolButton>
      <ToolButton
        label={t('library.tactics.tools.clearDrawings')}
        onClick={onClearDrawings}
        className="hover:text-damage"
      >
        <Trash2 />
      </ToolButton>

      {activeTool === 'pencil' && (
        <>
          <Divider />
          <div className="flex items-center gap-1.5 px-1.5 lg:flex-col lg:px-0 lg:py-1.5">
            {PENCIL_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => onSelectColor(color.value)}
                title={t(color.labelKey)}
                aria-label={t(color.labelKey)}
                aria-pressed={pencilColor === color.value}
                className={cn(
                  'size-4 shrink-0 rounded-full transition-transform',
                  pencilColor === color.value
                    ? 'scale-125 ring-2 ring-ink ring-offset-1 ring-offset-surface-1'
                    : 'opacity-70 hover:opacity-100',
                )}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
