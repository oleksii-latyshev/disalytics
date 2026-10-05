import { type Lineup, type LineupSide, UTILITY_NAMES } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Dialog } from '@disa/ui';
import { Pencil, Trash2, X } from 'lucide-react';
import { UtilityGlyph } from '@/core/glyphs';
import { LineupImageViewer } from './LineupImageViewer';
import { LineupInfoSidebar } from './LineupInfoSidebar';
import { LineupTagChips } from './LineupTagChips';

interface Props {
  readonly lineup: Lineup | null;
  readonly isOpen: boolean;
  readonly onDismiss: () => void;
  readonly onEdit?: ((lineup: Lineup) => void) | undefined;
  readonly onDelete?: ((id: string) => void) | undefined;
}

const SIDE_STYLES: Readonly<Record<LineupSide, string>> = {
  CT: 'text-ct border-ct/30 bg-ct/10',
  T: 'text-t border-t/30 bg-t/10',
  BOTH: 'text-ink border-line bg-surface-3',
};

function safeMediaUrl(url: string | undefined): string | null {
  return url && /^https?:\/\/[^\s]+$/i.test(url) ? url : null;
}

function imageUrlOf(url: string | null): string | null {
  return url && /\.(?:png|jpe?g|webp|gif)(?:\?[^\s]*)?$/i.test(url) ? url : null;
}

function LineupDetailHeader({
  lineup,
  onDismiss,
  onEdit,
  onDelete,
}: {
  readonly lineup: Lineup;
  readonly onDismiss: () => void;
  readonly onEdit?: ((lineup: Lineup) => void) | undefined;
  readonly onDelete?: ((id: string) => void) | undefined;
}) {
  const t = useT();

  const handleDelete = () => {
    if (
      onDelete !== undefined &&
      !lineup.isBuiltIn &&
      window.confirm(t('library.lineups.deleteConfirm'))
    ) {
      onDelete(lineup.id);
      onDismiss();
    }
  };

  const handleEdit = () => {
    if (onEdit !== undefined) {
      onEdit(lineup);
      onDismiss();
    }
  };

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b border-line bg-surface-1 px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 mr-2">
        <h2
          id="lineup-detail-title"
          className="truncate font-ui font-medium text-13 sm:text-14 text-ink max-w-[12rem] sm:max-w-xs md:max-w-md"
          title={lineup.title}
        >
          {lineup.title}
        </h2>
        <span
          className={`shrink-0 rounded-chip border px-1.5 py-0.5 font-medium text-10 ${
            SIDE_STYLES[lineup.side]
          }`}
        >
          {lineup.side === 'BOTH' ? <Text path="library.lineups.bothSides" /> : lineup.side}
        </span>
        <span className="hidden sm:inline-flex shrink-0 items-center gap-1 rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-10 text-ink">
          <UtilityGlyph kind={lineup.kind} label={UTILITY_NAMES[lineup.kind]} size="control" />
          <span>{UTILITY_NAMES[lineup.kind]}</span>
        </span>
        <span className="hidden md:inline-block shrink-0 rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-10 text-ink-dim">
          <Text path={`review.maps.throw.types.${lineup.throwType}`} />
        </span>
        <span className="hidden lg:inline-block shrink-0 rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-10 text-ink-dim">
          <Text path={lineup.isBuiltIn ? 'library.lineups.builtIn' : 'library.lineups.custom'} />
        </span>
        <LineupTagChips tags={lineup.tags} />
        {lineup.targetCallout && (
          <span className="shrink-0 rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 font-medium text-10 text-ink">
            {lineup.targetCallout}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!lineup.isBuiltIn && (
          <>
            {onEdit !== undefined && (
              <button
                type="button"
                onClick={handleEdit}
                title={t('library.lineups.edit')}
                aria-label={t('library.lineups.edit')}
                className="rounded-chip p-1.5 text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <Pencil className="size-3.5 sm:size-4" />
              </button>
            )}
            {onDelete !== undefined && (
              <button
                type="button"
                onClick={handleDelete}
                title={t('library.lineups.delete')}
                aria-label={t('library.lineups.delete')}
                className="rounded-chip p-1.5 text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
              >
                <Trash2 className="size-3.5 sm:size-4" />
              </button>
            )}
          </>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('library.lineups.form.close')}
          className="rounded-chip p-1.5 text-ink-dim hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function LineupDetailModal({ lineup, isOpen, onDismiss, onEdit, onDelete }: Props) {
  if (lineup === null) return null;

  const mediaUrl = safeMediaUrl(lineup.mediaUrl);
  const imageUrls = lineup.imageUrls?.length
    ? lineup.imageUrls
    : [imageUrlOf(mediaUrl)].filter((url): url is string => url !== null);

  const isFromDemo = Boolean(
    lineup.fromDemo ?? (lineup.command && lineup.command.trim().length > 0),
  );

  const landingCommand =
    lineup.landingCommand ??
    (isFromDemo
      ? `setpos ${lineup.landing.x.toFixed(2)} ${lineup.landing.y.toFixed(2)} ${lineup.landing.z.toFixed(2)}`
      : null);

  return (
    <Dialog
      isOpen={isOpen}
      onDismiss={onDismiss}
      aria-labelledby="lineup-detail-title"
      className="flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[120rem] flex-col overflow-hidden p-0"
    >
      <LineupDetailHeader
        lineup={lineup}
        onDismiss={onDismiss}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden lg:flex-row">
        <LineupImageViewer
          title={lineup.title}
          imageUrls={imageUrls}
          imageCaptions={lineup.imageCaptions ?? []}
          kind={lineup.kind}
        />

        <LineupInfoSidebar
          lineup={lineup}
          landingCommand={landingCommand}
          isFromDemo={isFromDemo}
          mediaUrl={mediaUrl}
        />
      </div>
    </Dialog>
  );
}
