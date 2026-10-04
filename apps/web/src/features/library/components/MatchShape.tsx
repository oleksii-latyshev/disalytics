import type { OpeningSide } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { stripRows } from '../helpers/library-grid';

/**
 * How the match went, one cell per round, tinted by the team that won it.
 *
 * **It is the same attribution the score is counted over** — `roundWinners`, which `matchScore`
 * itself walks — so a strip and the numbers beside it cannot disagree. Reading `Round.winner`
 * directly would draw a shape that changes hands at halftime, which is #141 seen from the library.
 *
 * The colours are `--color-ct` and `--color-t`, and that is the rule rather than an exception to it:
 * a hue here means something the demo said.
 *
 * **Every row is the same 24-column grid**, so a cell is the same width in regulation and in
 * overtime, and a gap marks halftime. Overtime comes in rows of six under the regulation row, each
 * named in its own margin. It is hidden from a screen reader because the score is already stated
 * beside it, in words a strip of cells cannot improve on.
 */
export function MatchShape({ winners }: { winners: readonly OpeningSide[] }) {
  const t = useT();
  const rows = stripRows(winners);

  return (
    <span aria-hidden="true" className="flex flex-col gap-1">
      {rows.map((row) => (
        <span
          key={row.overtime ?? 0}
          className="grid grid-cols-[repeat(24,minmax(0,1fr))] items-center gap-x-[2px]"
        >
          {row.cells.map((cell, index) => (
            <span
              key={cell.number}
              className={`block h-2 min-w-0 rounded-[2px] ${cell.winner === 'ct' ? 'bg-ct' : 'bg-t'} ${index === row.halftimeAt ? 'ms-1' : ''}`}
            />
          ))}
          {row.overtime !== null && (
            <span className="numeric col-span-6 ms-1.5 text-10 text-ink-dim">
              {t('library.card.overtime', { index: row.overtime })}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}
