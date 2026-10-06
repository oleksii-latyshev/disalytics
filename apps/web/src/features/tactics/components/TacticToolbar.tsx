import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { MousePointer2, Pencil, Route } from 'lucide-react';
import type { ReactNode } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { type TacticTool, THROW_KINDS, type ThrowKind } from '../helpers/tactic-editor-state';

export interface TacticToolbarProps {
  readonly tool: TacticTool;
  readonly throwKind: ThrowKind;
  readonly onTool: (tool: TacticTool) => void;
  readonly onThrowKind: (kind: ThrowKind) => void;
  /** Tools of work that follows (expected enemies) join the row here. */
  readonly extra?: ReactNode;
}

const BUTTON =
  'flex h-8 items-center gap-1.5 rounded-chip px-2.5 text-13 transition-colors whitespace-nowrap';

export function toolClass(isOn: boolean): string {
  return cn(BUTTON, isOn ? 'bg-ink font-semibold text-surface-0' : 'text-ink-dim hover:bg-hover');
}

/** The map's tools: pick, route by points, pen, and one button for each grenade. */
export function TacticToolbar({ tool, throwKind, onTool, onThrowKind, extra }: TacticToolbarProps) {
  const t = useT();
  const tools = [
    { id: 'select', icon: <MousePointer2 className="size-4" />, key: 'select' },
    { id: 'route', icon: <Route className="size-4" />, key: 'route' },
    { id: 'pen', icon: <Pencil className="size-4" />, key: 'pen' },
  ] as const;

  return (
    <div
      role="toolbar"
      aria-label={t('library.tactics.board.tools.label')}
      className="absolute inset-x-2 top-2 z-10 flex max-w-max flex-wrap items-center gap-1 rounded-card border border-line bg-surface-1/90 p-1"
    >
      {tools.map(({ id, icon, key }) => (
        <button
          key={id}
          type="button"
          aria-pressed={tool === id}
          title={t(`library.tactics.board.tools.${key}Tip`)}
          aria-label={t(`library.tactics.board.tools.${key}`)}
          onClick={() => onTool(id)}
          className={toolClass(tool === id)}
        >
          {icon}
          <span className="hidden @[34rem]:inline">{t(`library.tactics.board.tools.${key}`)}</span>
        </button>
      ))}
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
      <span className="hidden px-1 text-12 text-ink-dim @[34rem]:inline">
        {t('library.tactics.board.tools.grenade')}
      </span>
      {THROW_KINDS.map((kind) => {
        const isOn = tool === 'grenade' && throwKind === kind;
        const name = t(`library.tactics.board.tools.kinds.${kind}`);
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={isOn}
            aria-label={name}
            title={name}
            onClick={() => onThrowKind(kind)}
            className={cn(
              'grid h-8 w-9 place-items-center rounded-chip transition-colors',
              isOn
                ? 'bg-surface-3 [box-shadow:inset_0_0_0_1.5px_var(--color-ink-dim)]'
                : 'hover:bg-hover',
            )}
          >
            <UtilityGlyph kind={kind} label={name} size="control" />
          </button>
        );
      })}
      {extra}
    </div>
  );
}

export function TacticHint({ children }: { readonly children: ReactNode }) {
  return (
    <p
      role="status"
      className="absolute inset-x-2 bottom-2 z-10 max-w-fit rounded-card border border-line bg-surface-1/90 px-3 py-1.5 text-12 text-ink-dim leading-prose"
    >
      {children}
    </p>
  );
}
