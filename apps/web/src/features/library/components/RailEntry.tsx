import { Text } from '@disa/i18n';
import type { RailSection } from '../helpers/views';

interface Props {
  section: RailSection;
  isCurrent: boolean;
  onSelect: () => void;
}

/**
 * One entry in §10.1's rail: 40px, §4's larger control height, a `--selected` fill and `--ink`
 * when it is the current one and `--ink-dim` when it is not.
 *
 * **An unfinished entry is told apart by its chip rather than by its ink.** §10.1 asks for
 * `--ink-faint` on the two that are not built, and §14 rules `--ink-faint` off text at 3.63:1 —
 * the floor wins, so the label stays at `--ink-dim` and the chip carries the reading.
 */
export function RailEntry({ section, isCurrent, onSelect }: Props) {
  return (
    <li>
      <button
        type="button"
        aria-current={isCurrent ? 'page' : undefined}
        onClick={onSelect}
        className={`flex h-10 w-full items-center gap-2 rounded-card px-3 text-left text-14 transition-colors duration-(--duration-micro) ease-out hover:bg-hover ${
          isCurrent ? 'bg-selected text-ink' : 'text-ink-dim'
        }`}
      >
        <span className="truncate">
          <Text path={section.labelPath} />
        </span>

        {section.isSoon && (
          <span className="label-dense ml-auto shrink-0 rounded-chip border border-line px-1.5 py-0.5 text-ink-dim">
            <Text path="library.shell.soon" />
          </span>
        )}
      </button>
    </li>
  );
}
