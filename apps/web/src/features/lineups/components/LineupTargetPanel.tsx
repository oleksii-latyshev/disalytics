import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { ExternalLink, X } from 'lucide-react';
import { UtilityGlyph } from '@/core/glyphs';
import { sideLabel, targetTitle } from '../helpers/lineup-labels';
import { mediaLinkOf } from '../helpers/lineup-photos';
import type { SavedTarget, SavedVariant } from '../helpers/lineup-targets';
import { LineupChips } from './LineupChips';
import { LineupCoordinatesCollapsible } from './LineupCoordinatesCollapsible';
import { LineupHowToRepeat } from './LineupHowToRepeat';
import { LineupOriginList } from './LineupOriginList';

interface Props {
  map: string;
  target: SavedTarget;
  variant: SavedVariant;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onOpenVariant: (id: string) => void;
  onClose: () => void;
  onEdit: () => void;
  onAnother: () => void;
}

/**
 * A picked target: where it can be thrown from, what the throw looks like, how to repeat it, and
 * the two ways to change what is saved — edit this position, or add another.
 */
export function LineupTargetPanel({
  map,
  target,
  variant,
  hoveredId,
  onHover,
  onOpenVariant,
  onClose,
  onEdit,
  onAnother,
}: Props) {
  const t = useT();
  const { lineup } = variant;
  const mediaLink = mediaLinkOf(lineup);
  const landingCommand =
    lineup.landingCommand ??
    `setpos ${lineup.landing.x.toFixed(2)} ${lineup.landing.y.toFixed(2)} ${lineup.landing.z.toFixed(2)}`;

  return (
    <div className="lineup-rise flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 [border-block-end:1px_solid_var(--color-line)] px-3.5 pt-3.5 pb-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-card bg-surface-2">
          <UtilityGlyph kind={target.kind} size="axis" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate font-semibold text-16 text-ink">{targetTitle(target)}</h2>
          <span className="numeric truncate text-11 text-ink-dim">
            <Text
              path="library.lineups.targetMeta"
              values={{ count: target.throwCount, side: sideLabel(target.side) }}
            />
          </span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t('library.lineups.closePanel')}
          className="text-ink-dim"
        >
          <X aria-hidden="true" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-3.5 py-3">
        <LineupOriginList
          target={target}
          activeId={variant.id}
          hoveredId={hoveredId}
          onHover={onHover}
          onOpen={onOpenVariant}
        />
        <LineupHowToRepeat map={map} lineup={lineup} />
        <LineupChips lineup={lineup} source={target.source} />
        {lineup.fromDemo === true && (
          <LineupCoordinatesCollapsible lineup={lineup} landingCommand={landingCommand} />
        )}
        {mediaLink !== null && (
          <a
            href={mediaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-12 text-ink-dim transition-colors hover:text-ink"
          >
            <ExternalLink aria-hidden="true" className="size-3.5" />
            <Text path="library.lineups.media" />
          </a>
        )}
      </div>

      <footer className="grid grid-cols-2 gap-2 [border-block-start:1px_solid_var(--color-line)] px-3.5 pt-3 pb-3.5">
        <Button variant="outline" size="lg" onClick={onEdit}>
          <Text path="library.lineups.editShort" />
        </Button>
        <Button variant="outline" size="lg" onClick={onAnother}>
          <Text path="library.lineups.another" />
        </Button>
        <p className="col-span-2 text-center text-11 text-ink-faint">
          <Text
            path={lineup.isBuiltIn ? 'library.lineups.note.builtIn' : 'library.lineups.note.mine'}
          />
        </p>
      </footer>
    </div>
  );
}
