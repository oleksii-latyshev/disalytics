import { Text, useT } from '@disa/i18n';
import { ArrowLeft, ArrowRight, Minus } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import type { Placement } from '../../helpers/home-layout';
import type { WidgetId, WidgetSize, WidgetSpec } from '../../helpers/home-widgets';

/** Spelled out in full, because Tailwind reads class names off the page and not off a template. */
const DESKTOP_SPAN: Readonly<Record<WidgetSize, string>> = {
  S: 'md:col-span-1 md:row-span-1',
  M: 'md:col-span-1 md:row-span-2',
  L: 'md:col-span-2 md:row-span-2',
  XL: 'md:col-span-2 md:row-span-4',
};

/** The phone's two columns: a strip is half a row, everything else a whole one. */
const PHONE_SPAN: Readonly<Record<WidgetSize, string>> = {
  S: 'col-span-1 row-span-1',
  M: 'col-span-2 row-span-2',
  L: 'col-span-2 row-span-2',
  XL: 'col-span-2 row-span-2',
};

const PHONE_SPAN_BY_ID: Readonly<Partial<Record<WidgetId, string>>> = {
  hero: 'col-span-2 row-span-6',
  stats: 'col-span-2 row-span-3',
};

interface Props {
  placement: Placement;
  spec: WidgetSpec;
  index: number;
  position: number;
  isEditing: boolean;
  isDragging: boolean;
  onDragStart: (id: WidgetId) => void;
  onDragOver: (id: WidgetId) => void;
  onDragEnd: () => void;
  onHide: (id: WidgetId) => void;
  onResize: (id: WidgetId, size: WidgetSize) => void;
  onMove: (id: WidgetId, delta: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
  children: ReactNode;
}

const CONTROL =
  'flex h-7 min-w-7 items-center justify-center rounded-chip px-1.5 text-ink-dim hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-30';

export function HomeTile({
  placement,
  spec,
  index,
  position,
  isEditing,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  onHide,
  onResize,
  onMove,
  isFirst,
  isLast,
  children,
}: Props) {
  const t = useT();
  const title = t(spec.titlePath);
  const span = `${PHONE_SPAN_BY_ID[spec.id] ?? PHONE_SPAN[placement.size]} ${DESKTOP_SPAN[placement.size]}`;
  const border = isEditing
    ? 'border-dashed border-line-strong'
    : spec.isSoon
      ? 'border-dashed border-line-strong'
      : 'border-line';

  return (
    <li
      draggable={isEditing}
      onDragStart={(event) => {
        if (!isEditing) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', spec.id);
        onDragStart(spec.id);
      }}
      onDragOver={(event) => {
        if (!isEditing) return;
        event.preventDefault();
        onDragOver(spec.id);
      }}
      onDrop={(event) => event.preventDefault()}
      onDragEnd={onDragEnd}
      style={{ '--tile-index': index } as CSSProperties}
      className={`home-tile group relative min-w-0 overflow-hidden rounded-float border ${border} ${
        spec.isSoon ? 'bg-transparent' : 'bg-surface-1'
      } ${span} ${isEditing ? 'home-tile-editing cursor-grab' : ''} ${
        isDragging ? 'opacity-35 outline-2 -outline-offset-2 outline-dashed outline-ink-dim' : ''
      }`}
    >
      {/* Inert while editing, so a press on the tile's own button is a drag handle and not a click. */}
      <div inert={isEditing} className="size-full">
        {children}
      </div>

      {isEditing && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-card border border-line-strong bg-surface-0/90 p-0.5">
          <button
            type="button"
            title={t('library.home.customize.removeShort')}
            aria-label={t('library.home.customize.remove', { widget: title })}
            onClick={() => onHide(spec.id)}
            className={CONTROL}
          >
            <Minus aria-hidden="true" className="size-4" />
          </button>
          {spec.sizes.length > 1 && (
            <fieldset className="m-0 flex min-w-0 border-0 p-0">
              <legend className="sr-only">
                {t('library.home.customize.size', { widget: title })}
              </legend>
              {spec.sizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={size === placement.size}
                  onClick={() => onResize(spec.id, size)}
                  className={`${CONTROL} font-mono text-12 ${
                    size === placement.size
                      ? 'bg-ink text-surface-0 hover:bg-ink hover:text-surface-0'
                      : ''
                  }`}
                >
                  {size}
                </button>
              ))}
            </fieldset>
          )}
          <button
            type="button"
            disabled={isFirst}
            aria-label={t('library.home.customize.earlier', { widget: title })}
            onClick={() => onMove(spec.id, -1)}
            className={CONTROL}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            disabled={isLast}
            aria-label={t('library.home.customize.later', { widget: title })}
            onClick={() => onMove(spec.id, 1)}
            className={CONTROL}
          >
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
          <span className="sr-only">
            <Text path="library.home.customize.position" values={{ position }} />
          </span>
        </div>
      )}
    </li>
  );
}
