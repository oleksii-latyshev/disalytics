import { Text, useT } from '@disa/i18n';
import { Plus } from 'lucide-react';
import { type HomeLayout, spanOf } from '../../helpers/home-layout';
import { WIDGETS, type WidgetId } from '../../helpers/home-widgets';

interface Props {
  layout: HomeLayout;
  hasMatches: boolean;
  isGalleryOpen: boolean;
  onGallery: () => void;
  onToggle: (id: WidgetId, isShown: boolean) => void;
  onReset: () => void;
  onDone: () => void;
}

const BUTTON =
  'h-10 rounded-card border border-line-strong px-3.5 text-14 font-medium text-ink transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

const FOOTPRINT_CELLS = [
  { key: 'top-left', column: 0, row: 0 },
  { key: 'top-right', column: 1, row: 0 },
  { key: 'bottom-left', column: 0, row: 1 },
  { key: 'bottom-right', column: 1, row: 1 },
] as const;

/** The widget's largest size as it sits in a two-by-two corner of the grid. */
function Footprint({ id }: { id: WidgetId }) {
  const spec = WIDGETS.find((widget) => widget.id === id);
  const { columns, rows } = spanOf(spec?.sizes.at(-1) ?? 'S');

  return (
    <span aria-hidden="true" className="grid grid-cols-2 grid-rows-2 gap-0.5">
      {FOOTPRINT_CELLS.map((cell) => (
        <span
          key={cell.key}
          className={`size-[7px] rounded-[2px] ${cell.column < columns && cell.row < rows ? 'bg-ink-dim' : 'bg-line'}`}
        />
      ))}
    </span>
  );
}

export function CustomizePanel({
  layout,
  hasMatches,
  isGalleryOpen,
  onGallery,
  onToggle,
  onReset,
  onDone,
}: Props) {
  const t = useT();

  return (
    <section
      aria-label={t('library.home.customize.title')}
      className="flex flex-col gap-3.5 rounded-float border border-line-strong bg-surface-1 px-[18px] py-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-16 font-semibold leading-dense">
            <Text path="library.home.customize.title" />
          </h2>
          <p className="text-13 text-ink-dim leading-prose">
            <Text path="library.home.customize.hint" />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={isGalleryOpen}
            onClick={onGallery}
            className={`${BUTTON} flex items-center gap-1.5 ${isGalleryOpen ? 'bg-surface-3' : ''}`}
          >
            <Plus aria-hidden="true" className="size-4" />
            <Text path="library.home.customize.add" />
          </button>
          <button type="button" onClick={onReset} className={BUTTON}>
            <Text path="library.home.customize.reset" />
          </button>
          <button
            type="button"
            onClick={onDone}
            className="h-10 rounded-card bg-ink px-3.5 text-14 font-medium text-surface-0 hover:bg-ink-dim focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <Text path="library.home.customize.done" />
          </button>
        </div>
      </div>

      {isGalleryOpen && (
        <div className="flex flex-col gap-2.5 pt-3.5 [border-block-start:1px_solid_var(--color-line)]">
          <p className="label-dense text-ink-dim">
            <Text path="library.home.customize.gallery" values={{ count: WIDGETS.length }} />
          </p>
          <ul className="m-0 grid list-none grid-cols-1 gap-2.5 p-0 sm:grid-cols-2 wide:grid-cols-3">
            {WIDGETS.map((spec) => {
              const placement = layout.find((entry) => entry.id === spec.id);
              const isOn = placement?.isShown === true;
              const isUsable = hasMatches || !spec.needsMatch;
              const Icon = spec.icon;

              return (
                <li
                  key={spec.id}
                  className={`flex flex-col gap-2.5 rounded-card border bg-surface-2 p-3 ${
                    isOn ? 'border-line' : 'border-line-strong'
                  } ${isUsable ? '' : 'opacity-60'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex size-[26px] shrink-0 items-center justify-center rounded-chip border border-line bg-surface-3"
                    >
                      <Icon className="size-3.5" strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-14 font-medium">
                      <Text path={spec.titlePath} />
                    </span>
                    <Footprint id={spec.id} />
                  </div>
                  <p className="text-12 text-ink-dim leading-prose">
                    <Text path={spec.blurbPath} />
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="font-mono text-11 text-ink-faint">
                      {spec.sizes.join(' · ')}
                    </span>
                    <button
                      type="button"
                      disabled={!isUsable}
                      aria-pressed={isOn}
                      onClick={() => onToggle(spec.id, !isOn)}
                      className={`h-8 shrink-0 rounded-chip px-3 text-13 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                        !isUsable
                          ? 'border border-dashed border-line-strong text-ink-faint'
                          : isOn
                            ? 'border border-line-strong text-ink-dim hover:bg-hover'
                            : 'bg-ink text-surface-0 hover:bg-ink-dim'
                      }`}
                    >
                      <Text
                        path={
                          !isUsable
                            ? 'library.home.customize.needsMatch'
                            : isOn
                              ? 'library.home.customize.on'
                              : 'library.home.customize.addAction'
                        }
                      />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
