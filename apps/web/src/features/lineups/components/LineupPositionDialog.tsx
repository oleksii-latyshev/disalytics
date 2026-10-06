import { Text, useT } from '@disa/i18n';
import { Button, Dialog } from '@disa/ui';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { UtilityGlyph } from '@/core/glyphs';
import { targetTitle } from '../helpers/lineup-labels';
import { captionsOf, photosOf } from '../helpers/lineup-photos';
import type { SavedTarget, SavedVariant } from '../helpers/lineup-targets';
import { useShotZoom } from '../hooks/use-shot-zoom';
import { LineupChips } from './LineupChips';
import { LineupHowToRepeat } from './LineupHowToRepeat';
import { LineupMiniMap } from './LineupMiniMap';
import { LineupPositionShots } from './LineupPositionShots';

interface Props {
  map: string;
  target: SavedTarget;
  variant: SavedVariant;
  /** Steps to another position of the target; the map behind follows. */
  onVariant: (id: string) => void;
  onEdit: () => void;
  onDismiss: () => void;
}

/** The way each key walks: back or forward. */
const STEP_OF_KEY: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  '[': -1,
  ArrowRight: 1,
  ']': 1,
};

/** The zoom keys: `+` (and `=`, its unshifted key) in, `-` out, `0` back to fitted. */
const ZOOM_OF_KEY: Readonly<Record<string, 1 | -1 | 0>> = { '+': 1, '=': 1, '-': -1, '0': 0 };

/** The position `by` steps from `index`, round the target's positions. */
function positionAt(target: SavedTarget, index: number, by: number): SavedVariant | undefined {
  const count = target.variants.length;

  return target.variants[(index + by + count) % count];
}

/**
 * One position, full screen: its screenshots at size on the left, and on the right everything
 * needed to throw it again — where it starts and lands, how to stand, aim and throw, the console
 * command — with a way to walk through the target's other positions.
 *
 * `←`/`→` step the screenshot and `Shift` with them, or `[` and `]`, step the position. The
 * screen's own shortcuts stand down while it is open.
 */
export function LineupPositionDialog({
  map,
  target,
  variant,
  onVariant,
  onEdit,
  onDismiss,
}: Props) {
  const t = useT();
  const { lineup } = variant;
  const photos = photosOf(lineup);
  const index = target.variants.indexOf(variant);
  const count = target.variants.length;
  const [shot, setShot] = useState({ variantId: variant.id, index: 0 });
  const photoIndex = shot.variantId === variant.id ? Math.min(shot.index, photos.length - 1) : 0;
  const zoom = useShotZoom(`${variant.id}:${photoIndex}`);

  const goToPosition = (by: number) => {
    const next = positionAt(target, index, by);
    if (next !== undefined && next.id !== variant.id) onVariant(next.id);
  };
  const goToPhoto = (by: number) => {
    if (photos.length > 1) {
      setShot({ variantId: variant.id, index: (photoIndex + by + photos.length) % photos.length });
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

    const zoomKey = ZOOM_OF_KEY[event.key];
    if (zoomKey !== undefined && photos.length > 0) {
      event.preventDefault();
      if (zoomKey === 0) zoom.reset();
      else zoom.zoomBy(zoomKey);
      return;
    }

    const direction = STEP_OF_KEY[event.key];
    if (direction === undefined) return;

    event.preventDefault();
    const isPosition = event.key === '[' || event.key === ']' || event.shiftKey;
    if (isPosition) goToPosition(direction);
    else goToPhoto(direction);
  };

  return (
    <Dialog
      isOpen
      onDismiss={onDismiss}
      aria-label={lineup.title}
      data-shortcuts-suspended
      onKeyDown={handleKeyDown}
      className="grid h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] grid-cols-1 sm:h-[calc(100dvh-3.5rem)] sm:w-[calc(100vw-4rem)] grid-rows-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden p-0 lg:grid-cols-[minmax(0,1fr)_23.75rem] lg:grid-rows-1"
    >
      <LineupPositionShots
        photos={photos}
        captions={captionsOf(lineup)}
        title={lineup.title}
        index={photoIndex}
        onIndex={(next) => setShot({ variantId: variant.id, index: next })}
        onAdd={onEdit}
        zoom={zoom}
      />

      <aside className="flex min-h-0 flex-col [border-block-start:1px_solid_var(--color-line)] lg:[border-block-start:0] lg:[border-inline-start:1px_solid_var(--color-line)]">
        <header className="flex items-center gap-2.5 [border-block-end:1px_solid_var(--color-line)] px-3.5 pt-3.5 pb-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-card bg-surface-2">
            <UtilityGlyph kind={target.kind} size="axis" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="truncate font-semibold text-16 text-ink">{lineup.title}</h2>
            <span className="numeric truncate text-11 text-ink-dim">
              <Text
                path="library.lineups.position.of"
                values={{ target: targetTitle(target), index: index + 1, count }}
              />
            </span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            aria-label={t('library.lineups.form.close')}
            className="text-ink-dim"
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-3.5 py-3.5">
          <LineupMiniMap map={map} lineup={lineup} />
          <LineupHowToRepeat map={map} lineup={lineup} isCommandWrapped />
          <LineupChips lineup={lineup} source={target.source} />
        </div>

        <footer className="flex flex-col gap-2 [border-block-start:1px_solid_var(--color-line)] px-3.5 pt-3 pb-3.5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2">
            <Button
              variant="outline"
              size="icon-lg"
              disabled={count < 2}
              onClick={() => goToPosition(-1)}
              aria-label={t('library.lineups.position.previous')}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button variant="outline" size="lg" onClick={onEdit}>
              <Text path="library.lineups.editShort" />
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              disabled={count < 2}
              onClick={() => goToPosition(1)}
              aria-label={t('library.lineups.position.next')}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <p className="text-center text-11 text-ink-faint leading-snug">
            <Text path="library.lineups.position.keys" />
          </p>
        </footer>
      </aside>
    </Dialog>
  );
}
