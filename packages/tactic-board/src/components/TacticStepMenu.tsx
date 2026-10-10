import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { type MenuBox, placeMenu } from '../helpers/tactic-menu';

const MENU_SIZE: MenuBox = { width: 224, height: 132 };
const CONFIRM_SIZE: MenuBox = { width: 224, height: 170 };

export interface TacticStepMenuProps {
  /** Where it opened, in the coordinates of the box that holds it. */
  readonly point: { readonly x: number; readonly y: number };
  readonly box: MenuBox;
  readonly stepIndex: number;
  readonly stepName: string;
  /** Why the step cannot go, or null when it can. */
  readonly deleteBlock: string | null;
  readonly onOpen: () => void;
  readonly onBranch: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}

const ITEM =
  'flex h-8 w-full items-center rounded-chip px-2.5 text-left text-13 transition-colors hover:bg-hover focus-visible:bg-hover disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-transparent';

export function TacticStepMenu({
  point,
  box,
  stepIndex,
  stepName,
  deleteBlock,
  onOpen,
  onBranch,
  onDelete,
  onClose,
}: TacticStepMenuProps) {
  const t = useT();
  const [isConfirming, setIsConfirming] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const place = placeMenu(point, box, isConfirming ? CONFIRM_SIZE : MENU_SIZE);

  useEffect(() => {
    const before = document.activeElement;
    menu.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
    return () => {
      if (before instanceof HTMLElement) before.focus();
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const items = [...(menu.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? [])];
    const at = items.findIndex((item) => item.matches(':focus'));
    const next = (at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };

  const name =
    stepName.trim() || t('library.tactics.board.strip.unnamed', { index: stepIndex + 1 });

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('library.tactics.board.menu.cancel')}
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
        className="absolute inset-0 z-40 cursor-default"
      />
      <div
        ref={menu}
        role="menu"
        aria-label={t('library.tactics.board.menu.label')}
        onKeyDown={handleKeyDown}
        style={{ left: place.left, top: place.top, width: MENU_SIZE.width }}
        className="surface-card absolute z-50 flex flex-col gap-0.5 rounded-card p-1.5 shadow-float"
      >
        <span className="truncate px-2.5 pt-1 pb-1.5 font-mono text-11 text-ink-faint">
          {stepIndex + 1} · {name}
        </span>
        {isConfirming ? (
          <div className="flex flex-col gap-2 px-1.5 pb-1">
            <span className="text-13 leading-dense">
              {t('library.tactics.board.menu.confirm', { index: stepIndex + 1, name })}
            </span>
            <span className="text-11 text-ink-faint">
              {t('library.tactics.board.menu.undoNote')}
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={onClose}
                className="h-8 rounded-chip border border-line text-12 hover:bg-hover"
              >
                {t('library.tactics.board.menu.cancel')}
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="h-8 rounded-chip bg-damage font-semibold text-12 text-surface-0"
              >
                {t('library.tactics.board.menu.confirmButton')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <button type="button" role="menuitem" className={ITEM} onClick={onOpen}>
              {t('library.tactics.board.menu.open')}
            </button>
            <button type="button" role="menuitem" className={ITEM} onClick={onBranch}>
              {t('library.tactics.board.menu.branchHere')}
            </button>
            <button
              type="button"
              role="menuitem"
              className={cn(ITEM, deleteBlock === null && 'text-damage')}
              disabled={deleteBlock !== null}
              title={deleteBlock ?? undefined}
              onClick={() => setIsConfirming(true)}
            >
              {t('library.tactics.board.menu.delete')}
            </button>
          </>
        )}
      </div>
    </>
  );
}
