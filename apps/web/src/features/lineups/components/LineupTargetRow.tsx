import { Text, useT } from '@disa/i18n';
import { CheckSquare, Square } from 'lucide-react';
import { UtilityGlyph } from '@/core/glyphs';
import { sideLabel, targetTitle } from '../helpers/lineup-labels';
import type { SavedTarget } from '../helpers/lineup-targets';

const SIDE_INK = { T: 'text-t', CT: 'text-ct', BOTH: 'text-ink-dim' } as const;

interface Props {
  target: SavedTarget;
  index: number;
  isOn: boolean;
  isSelecting: boolean;
  isChecked: boolean;
  onPress: (id: string) => void;
}

/** One target in "Where it lands": what lands, how many ways to throw it, and whose it is. */
export function LineupTargetRow({ target, index, isOn, isSelecting, isChecked, onPress }: Props) {
  const t = useT();
  const title = targetTitle(target);

  return (
    <li className="lineup-row" style={{ '--row-index': index } as React.CSSProperties}>
      <button
        type="button"
        aria-pressed={isSelecting ? isChecked : isOn}
        aria-label={isSelecting ? t('library.lineups.selectLineup', { title }) : undefined}
        onClick={() => onPress(target.id)}
        className={`flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-card border px-2 py-1.5 text-left transition-colors duration-(--duration-micro) ease-out ${isOn || isChecked ? 'border-line-strong bg-selected' : 'border-transparent hover:bg-hover'}`}
      >
        {isSelecting &&
          (isChecked ? (
            <CheckSquare aria-hidden="true" className="size-4 shrink-0 text-ink" />
          ) : (
            <Square aria-hidden="true" className="size-4 shrink-0 text-ink-dim" />
          ))}
        <span className="grid size-8 shrink-0 place-items-center rounded-card bg-surface-2">
          <UtilityGlyph kind={target.kind} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium text-13 text-ink">{title}</span>
          <span className="numeric flex items-center gap-1.5 truncate text-11 text-ink-dim">
            <Text path="library.lineups.positions" values={{ count: target.throwCount }} />
            <span className="rounded-chip border border-line px-1 font-ui text-10">
              <Text path={`library.lineups.source.${target.source}`} />
            </span>
          </span>
        </span>
        <span className={`numeric shrink-0 font-semibold text-11 ${SIDE_INK[target.side]}`}>
          {sideLabel(target.side)}
        </span>
      </button>
    </li>
  );
}
