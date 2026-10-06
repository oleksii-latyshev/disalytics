import type { TacticSide } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { enemySideVar } from '../helpers/tactic-colors';
import { toolClass } from './TacticToolbar';

export interface TacticEnemyToolButtonProps {
  readonly isOn: boolean;
  readonly enemySide: TacticSide;
  readonly onPick: () => void;
}

/** The map toolbar's enemy tool, marked with the shape and colour its marks are drawn in. */
export function TacticEnemyToolButton({ isOn, enemySide, onPick }: TacticEnemyToolButtonProps) {
  const t = useT();
  return (
    <>
      <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
      <button
        type="button"
        aria-pressed={isOn}
        title={t('library.tactics.board.enemy.toolTip')}
        aria-label={t('library.tactics.board.enemy.tool')}
        onClick={onPick}
        className={toolClass(isOn)}
      >
        <span
          aria-hidden="true"
          className="size-3.5 rounded-[4px] [box-shadow:0_0_0_1.5px_var(--color-surface-0)]"
          style={{ background: enemySideVar(enemySide) }}
        />
        <span className="hidden @[60rem]:inline">{t('library.tactics.board.enemy.tool')}</span>
      </button>
    </>
  );
}
