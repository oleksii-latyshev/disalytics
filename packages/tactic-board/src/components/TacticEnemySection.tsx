import {
  TACTIC_ENEMY_ROLES,
  type TacticEnemy,
  type TacticEnemyRole,
  type TacticSide,
} from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { Trash2 } from 'lucide-react';
import { useId } from 'react';
import { enemySideVar, slotVar } from '../helpers/tactic-colors';

export interface TacticEnemySectionProps {
  readonly enemies: readonly TacticEnemy[];
  readonly pickedId: string | null;
  readonly stepNumber: number;
  readonly slotCount: number;
  readonly enemySide: TacticSide;
  /** Whether to show the section although the step has no enemy yet: the enemy tool is in hand. */
  readonly isToolInHand: boolean;
  readonly onPick: (id: string) => void;
  readonly onNote: (id: string, note: string) => void;
  readonly onRole: (id: string, role: TacticEnemyRole) => void;
  readonly onTaker: (id: string, slot: number | null) => void;
  readonly onDead: (id: string, isDead: boolean) => void;
  readonly onRemove: (id: string) => void;
  readonly onCommit: () => void;
}

const FIELD =
  'w-full rounded-chip border border-line bg-surface-0 px-2.5 text-13 text-ink placeholder:text-ink-faint focus-visible:border-line-strong';
const CHIP = 'flex h-7 items-center rounded-chip border px-2.5 text-12 transition-colors';

function labelOf(enemy: TacticEnemy, number: number, t: ReturnType<typeof useT>): string {
  const note = enemy.note?.trim();
  if (note !== undefined && note !== '') return note;
  if (enemy.role !== undefined) return t(`library.tactics.board.enemy.roles.${enemy.role}`);
  return t('library.tactics.board.enemy.pick', { number });
}

/** What the step expects of the other side: the marks on it, and the one picked in full. */
export function TacticEnemySection(props: TacticEnemySectionProps) {
  const { enemies, pickedId, enemySide, isToolInHand } = props;
  const t = useT();
  if (enemies.length === 0 && !isToolInHand) return null;
  const picked = enemies.find((enemy) => enemy.id === pickedId);
  const accent = enemySideVar(enemySide);

  return (
    <section
      aria-label={t('library.tactics.board.enemy.section')}
      className="flex flex-col gap-3 p-3 [border-block-start:1px_solid_var(--color-line)]"
    >
      {enemies.length === 0 ? (
        <p className="text-12 text-ink-dim">{t('library.tactics.board.enemy.empty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
          {enemies.map((enemy, index) => (
            <li key={enemy.id}>
              <button
                type="button"
                aria-pressed={enemy.id === pickedId}
                onClick={() => props.onPick(enemy.id)}
                className={cn(
                  CHIP,
                  'max-w-44 gap-1.5 truncate',
                  enemy.id === pickedId
                    ? 'border-line-strong bg-surface-3 text-ink'
                    : 'border-line text-ink-dim hover:bg-hover',
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: enemy.isDead === true ? 'var(--color-ink-faint)' : accent }}
                />
                <span className="truncate">{labelOf(enemy, index + 1, t)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked !== undefined && <EnemyDetails {...props} enemy={picked} accent={accent} />}
    </section>
  );
}

function EnemyDetails({
  enemy,
  accent,
  stepNumber,
  slotCount,
  enemySide,
  onNote,
  onRole,
  onTaker,
  onDead,
  onRemove,
  onCommit,
}: TacticEnemySectionProps & { readonly enemy: TacticEnemy; readonly accent: string }) {
  const t = useT();
  const noteId = useId();
  const isDead = enemy.isDead === true;

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface-0/40 p-3">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-[8px] font-mono text-11 font-bold text-surface-0"
          style={{ background: isDead ? 'var(--color-ink-faint)' : accent }}
        >
          {isDead ? '✕' : enemySide}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-14 font-semibold">{t('library.tactics.board.enemy.title')}</span>
          <span className="font-mono text-11 text-ink-dim">
            {t('library.tactics.board.enemy.assumption', { step: stepNumber })}
          </span>
        </span>
        <button
          type="button"
          aria-label={t('library.tactics.board.enemy.remove')}
          title={t('library.tactics.board.enemy.remove')}
          onClick={() => onRemove(enemy.id)}
          className="grid size-8 place-items-center rounded-chip text-ink-dim transition-colors hover:bg-hover"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <label htmlFor={noteId} className="flex flex-col gap-1 text-12 text-ink-dim">
        {t('library.tactics.board.enemy.note')}
        <input
          id={noteId}
          type="text"
          value={enemy.note ?? ''}
          onChange={(event) => onNote(enemy.id, event.target.value)}
          onBlur={onCommit}
          placeholder={t('library.tactics.board.enemy.notePlaceholder')}
          className={cn(FIELD, 'h-9')}
        />
      </label>

      <fieldset
        aria-label={t('library.tactics.board.enemy.role')}
        className="m-0 flex min-w-0 flex-wrap gap-1 border-none p-0"
      >
        {TACTIC_ENEMY_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            aria-pressed={enemy.role === role}
            onClick={() => onRole(enemy.id, role)}
            className={cn(
              CHIP,
              enemy.role === role
                ? 'border-line-strong bg-ink font-semibold text-surface-0'
                : 'border-line text-ink-dim hover:bg-hover',
            )}
          >
            {t(`library.tactics.board.enemy.roles.${role}`)}
          </button>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <span className="text-12 text-ink-dim">{t('library.tactics.board.enemy.taker')}</span>
        <fieldset
          aria-label={t('library.tactics.board.enemy.taker')}
          className="m-0 flex min-w-0 flex-wrap gap-1 border-none p-0"
        >
          <button
            type="button"
            aria-pressed={enemy.killedBy === undefined}
            aria-label={t('library.tactics.board.enemy.nobody')}
            title={t('library.tactics.board.enemy.nobody')}
            onClick={() => onTaker(enemy.id, null)}
            className={cn(
              'h-8 min-w-9 rounded-chip border px-2 font-mono text-12 font-bold transition-colors',
              enemy.killedBy === undefined
                ? 'border-line-strong bg-surface-3 text-ink'
                : 'border-line text-ink-dim hover:bg-hover',
            )}
          >
            —
          </button>
          {Array.from({ length: slotCount }, (_, slot) => {
            const isOn = enemy.killedBy === slot;
            return (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: the slots are a fixed row
                key={slot}
                type="button"
                aria-pressed={isOn}
                aria-label={t('library.tactics.board.enemy.pickPlayer', { slot: slot + 1 })}
                onClick={() => onTaker(enemy.id, slot)}
                className="h-8 min-w-9 rounded-chip border-[1.5px] px-2 font-mono text-12 font-bold transition-colors"
                style={{
                  borderColor: slotVar(slot),
                  background: isOn ? slotVar(slot) : 'transparent',
                  color: isOn ? 'var(--color-surface-0)' : slotVar(slot),
                }}
              >
                {slot + 1}
              </button>
            );
          })}
        </fieldset>
      </div>

      <button
        type="button"
        aria-pressed={isDead}
        onClick={() => onDead(enemy.id, !isDead)}
        className={cn(
          'h-9 rounded-chip border px-2.5 text-12 transition-colors',
          isDead
            ? 'border-line-strong bg-surface-3 font-semibold text-ink'
            : 'border-dashed border-line-strong text-ink-dim hover:bg-hover',
        )}
      >
        {isDead
          ? `✕ ${t('library.tactics.board.enemy.killed')}`
          : `✕ ${t('library.tactics.board.enemy.kill')}`}
      </button>
    </div>
  );
}
