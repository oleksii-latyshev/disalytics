import { Text } from '@disa/i18n';
import type { RailSection } from '../helpers/views';

interface Props {
  section: RailSection;
  isCurrent: boolean;
  onSelect: () => void;
}

/**
 * One entry in the rail: 40px, the taller of the two control heights, `--ink` when it is the current
 * one and `--ink-dim` when it is not.
 *
 * **It draws no background of its own.** The mark for the current entry is the pill `SideRail` slides
 * between entries, and a fill here would be a second one appearing under it. What is left is the ink
 * step and `aria-current`, which is the reading either way.
 *
 * `relative` is load-bearing rather than habit: the pill is an absolutely positioned sibling with
 * `z-index: 0`, and a static button's text paints *below* a positioned sibling however late it comes
 * in the DOM. Positioning the button is what puts its own label back on top of the pill that marks
 * it.
 *
 * **An unfinished entry is told apart by its chip rather than by its ink.** `--ink-faint` is under
 * 4.5:1 on every surface in the product and so never carries text; the label stays at `--ink-dim`
 * and the chip says the rest.
 */
export function RailEntry({ section, isCurrent, onSelect }: Props) {
  return (
    <button
      type="button"
      aria-current={isCurrent ? 'page' : undefined}
      onClick={onSelect}
      className={`relative flex h-10 w-full items-center gap-2 rounded-card px-3 text-left text-14 transition-colors duration-(--duration-micro) ease-out ${
        isCurrent ? 'text-ink' : 'text-ink-dim hover:bg-hover hover:text-ink'
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
  );
}
