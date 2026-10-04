import { Text, useT } from '@disa/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@disa/ui';
import { GripVertical, Trash2 } from 'lucide-react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import { type Placement, sizeDimensions } from '../../helpers/home-layout';
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
  children: ReactNode;
}

const CONTROL =
  'flex size-8 items-center justify-center rounded-chip text-ink-dim hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-focus';

/** The pointer's place in the tile, written straight onto it: a spotlight must not render React. */
function followPointer(event: PointerEvent<HTMLLIElement>) {
  const tile = event.currentTarget;
  const box = tile.getBoundingClientRect();
  tile.style.setProperty('--mx', `${Math.round(event.clientX - box.left)}px`);
  tile.style.setProperty('--my', `${Math.round(event.clientY - box.top)}px`);
}

/** Arrow keys on the handle: left and up go earlier, right and down later. */
function stepOf(event: KeyboardEvent): -1 | 1 | null {
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      return -1;
    case 'ArrowRight':
    case 'ArrowDown':
      return 1;
    default:
      return null;
  }
}

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
  children,
}: Props) {
  const t = useT();
  const sizeLabel = (size: WidgetSize) =>
    t('library.home.customize.sizeOption', {
      name: t(`library.home.customize.sizeName.${size}`),
      dimensions: sizeDimensions(size),
    });
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
      onPointerMove={isEditing || spec.isSoon ? undefined : followPointer}
      style={{ '--tile-index': index } as CSSProperties}
      className={`home-tile ${isEditing || spec.isSoon ? '' : 'home-tile-lit'} group relative min-w-0 overflow-hidden rounded-float border ${border} ${
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
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-card border border-line-strong bg-surface-0/90 p-1">
          <button
            type="button"
            title={t('library.home.customize.handle', { widget: title })}
            aria-label={t('library.home.customize.handle', { widget: title })}
            onKeyDown={(event) => {
              const step = stepOf(event);
              if (step === null) return;
              event.preventDefault();
              onMove(spec.id, step);
            }}
            className={`${CONTROL} cursor-grab`}
          >
            <GripVertical aria-hidden="true" className="size-4" />
          </button>
          {spec.sizes.length > 1 && (
            <Select
              value={placement.size}
              onValueChange={(next) => {
                const size = spec.sizes.find((candidate) => candidate === next);
                if (size !== undefined) onResize(spec.id, size);
              }}
            >
              <SelectTrigger
                aria-label={t('library.home.customize.size', { widget: title })}
                className="h-8 w-auto gap-1.5 border-0 bg-transparent px-2 text-12"
              >
                <SelectValue>{() => sizeLabel(placement.size)}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {spec.sizes.map((size) => (
                  <SelectItem key={size} value={size}>
                    {sizeLabel(size)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <button
            type="button"
            title={t('library.home.customize.removeShort')}
            aria-label={t('library.home.customize.remove', { widget: title })}
            onClick={() => onHide(spec.id)}
            className={CONTROL}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
          <span className="sr-only">
            <Text path="library.home.customize.position" values={{ position }} />
          </span>
        </div>
      )}
    </li>
  );
}
