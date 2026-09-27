import { type Lineup, type LineupSide, UTILITY_NAMES } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, Dialog } from '@disa/ui';
import {
  Check,
  Copy,
  ExternalLink,
  Pencil,
  RotateCcw,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { UtilityGlyph } from '@/core/glyphs';

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
    if (onDelete !== undefined && !lineup.isBuiltIn) {
      if (window.confirm(t('library.lineups.deleteConfirm'))) {
        onDelete(lineup.id);
        onDismiss();
      }
    }
  };

  const handleEdit = () => {
    if (onEdit !== undefined) {
      onEdit(lineup);
      onDismiss();
    }
  };

  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 font-ui font-medium text-14 text-ink">
          <Text path="library.lineups.detailsTitle" />
        </span>
        <span
          className={`rounded-chip border px-2 py-0.5 font-medium text-11 ${
            SIDE_STYLES[lineup.side]
          }`}
        >
          {lineup.side === 'BOTH' ? <Text path="library.lineups.bothSides" /> : lineup.side}
        </span>

        <span className="flex items-center gap-1 rounded-chip border border-line bg-surface-2 px-2 py-0.5 text-11 text-ink">
          <UtilityGlyph kind={lineup.kind} label={UTILITY_NAMES[lineup.kind]} size="control" />
          <span>{UTILITY_NAMES[lineup.kind]}</span>
        </span>

        <span className="rounded-chip border border-line bg-surface-2 px-2 py-0.5 text-11 text-ink-dim">
          <Text path={`review.maps.throw.types.${lineup.throwType}`} />
        </span>

        <span className="rounded-chip border border-line bg-surface-1 px-2 py-0.5 text-11 text-ink-dim">
          <Text path={lineup.isBuiltIn ? 'library.lineups.builtIn' : 'library.lineups.custom'} />
        </span>
      </div>

      <div className="flex items-center gap-1">
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
                <Pencil className="size-4" />
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
                <Trash2 className="size-4" />
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

function LineupMovementNotes({ lineup }: { readonly lineup: Lineup }) {
  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-1 p-3">
      {lineup.movementKeys && lineup.movementKeys.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="label-dense text-ink-dim">
            <Text path="library.lineups.movement" />:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {lineup.movementKeys.map((key) => (
              <kbd
                key={key}
                className="rounded-chip border border-line bg-surface-2 px-2 py-0.5 font-mono font-medium text-11 text-ink"
              >
                {key}
              </kbd>
            ))}
          </div>
        </div>
      )}

      {lineup.movementInstructions && (
        <p className="text-13 text-ink leading-prose">{lineup.movementInstructions}</p>
      )}

      {lineup.notes && <p className="text-12 text-ink-dim leading-prose">{lineup.notes}</p>}
    </div>
  );
}

function LineupImageGallery({
  title,
  imageUrls,
  onZoom,
}: {
  readonly title: string;
  readonly imageUrls: readonly string[];
  readonly onZoom: (url: string) => void;
}) {
  if (imageUrls.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <span className="label-dense text-ink-dim">
        <Text path="library.lineups.form.imageUrls" /> ({imageUrls.length})
      </span>
      <div
        className={`grid gap-3 ${imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}
      >
        {Array.from(new Set(imageUrls)).map((url, idx) => (
          <div
            key={url}
            className="group relative overflow-hidden rounded-card border border-line bg-surface-1"
          >
            <img
              src={url}
              alt={`${title} ${idx + 1}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="aspect-video w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-surface-0/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-150 group-hover:opacity-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onZoom(url)}
                className="h-7 gap-1.5 px-2.5 text-11 shadow-float"
              >
                <ZoomIn className="size-3.5" />
                <Text path="library.lineups.zoomImage" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineupConsoleCommands({
  lineup,
  landingCommand,
  isFromDemo,
}: {
  readonly lineup: Lineup;
  readonly landingCommand: string | null;
  readonly isFromDemo: boolean;
}) {
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [copiedLanding, setCopiedLanding] = useState(false);

  useEffect(() => {
    if (!copiedOrigin) return;
    const timer = setTimeout(() => setCopiedOrigin(false), 2000);
    return () => clearTimeout(timer);
  }, [copiedOrigin]);

  useEffect(() => {
    if (!copiedLanding) return;
    const timer = setTimeout(() => setCopiedLanding(false), 2000);
    return () => clearTimeout(timer);
  }, [copiedLanding]);

  const copyToClipboard = async (text: string, type: 'origin' | 'landing') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'origin') setCopiedOrigin(true);
      else setCopiedLanding(true);
    } catch {
      // Ignore clipboard write failure in non-secure context
    }
  };

  if (!isFromDemo) {
    return (
      <div className="rounded-card border border-line bg-surface-1 p-3">
        <p className="text-11 text-ink-dim leading-prose">
          <Text path="library.lineups.manualNotice" />
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-line bg-surface-1 p-3">
      <div className="flex items-center justify-between">
        <span className="rounded-chip border border-ct/30 bg-ct/10 px-2 py-0.5 text-11 text-ct">
          <Text path="library.lineups.fromDemoNotice" />
        </span>
      </div>

      {lineup.command && (
        <div className="flex flex-col gap-1.5">
          <span className="label-dense text-11 text-ink-dim">
            <Text path="library.lineups.commandOrigin" />
          </span>
          <div className="flex items-center gap-1.5 rounded-card border border-line bg-surface-2 p-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-11 text-ink selection:bg-surface-3">
              {lineup.command}
            </code>
            <Button
              variant="secondary"
              onClick={() => copyToClipboard(lineup.command, 'origin')}
              className="h-6 shrink-0 gap-1 px-2 text-11"
            >
              {copiedOrigin ? (
                <>
                  <Check className="size-3 text-ct" />
                  <Text path="library.lineups.copied" />
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <Text path="library.lineups.copyCommand" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {landingCommand && (
        <div className="flex flex-col gap-1.5">
          <span className="label-dense text-11 text-ink-dim">
            <Text path="library.lineups.commandLanding" />
          </span>
          <div className="flex items-center gap-1.5 rounded-card border border-line bg-surface-2 p-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-11 text-ink selection:bg-surface-3">
              {landingCommand}
            </code>
            <Button
              variant="secondary"
              onClick={() => copyToClipboard(landingCommand, 'landing')}
              className="h-6 shrink-0 gap-1 px-2 text-11"
            >
              {copiedLanding ? (
                <>
                  <Check className="size-3 text-ct" />
                  <Text path="library.lineups.copied" />
                </>
              ) : (
                <>
                  <Copy className="size-3" />
                  <Text path="library.lineups.copyLandingCommand" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LineupImageZoomDialog({
  title,
  url,
  onClose,
}: {
  readonly title: string;
  readonly url: string | null;
  readonly onClose: () => void;
}) {
  const t = useT();
  const [zoomScale, setZoomScale] = useState(1);

  if (url === null) return null;

  return (
    <Dialog isOpen onDismiss={onClose} className="w-[95vw] max-w-[80rem] p-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <span className="font-ui font-medium text-14 text-ink">{title}</span>
          <span className="font-mono text-11 text-ink-dim">({Math.round(zoomScale * 100)}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setZoomScale((s) => Math.min(4, s + 0.25))}
            title={t('library.lineups.zoomIn')}
            aria-label={t('library.lineups.zoomIn')}
            className="size-7"
          >
            <ZoomIn className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.25))}
            title={t('library.lineups.zoomOut')}
            aria-label={t('library.lineups.zoomOut')}
            className="size-7"
          >
            <ZoomOut className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setZoomScale(1)}
            title={t('library.lineups.zoomReset')}
            aria-label={t('library.lineups.zoomReset')}
            className="size-7"
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('library.lineups.form.close')}
            className="size-7"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex max-h-[80vh] items-center justify-center overflow-auto rounded-card bg-surface-0 p-2">
        <img
          src={url}
          alt={title}
          style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
          className="max-h-[75vh] max-w-full rounded object-contain transition-transform duration-100"
        />
      </div>
    </Dialog>
  );
}

export function LineupDetailModal({ lineup, isOpen, onDismiss, onEdit, onDelete }: Props) {
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

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
    <>
      <Dialog
        isOpen={isOpen}
        onDismiss={onDismiss}
        className="w-full max-w-[44rem] overflow-hidden"
      >
        <LineupDetailHeader
          lineup={lineup}
          onDismiss={onDismiss}
          onEdit={onEdit}
          onDelete={onDelete}
        />

        <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto px-5 py-4">
          <h2 className="font-ui font-medium text-20 text-ink leading-dense">{lineup.title}</h2>

          <LineupMovementNotes lineup={lineup} />

          <LineupImageGallery
            title={lineup.title}
            imageUrls={imageUrls}
            onZoom={setZoomedImageUrl}
          />

          <LineupConsoleCommands
            lineup={lineup}
            landingCommand={landingCommand}
            isFromDemo={isFromDemo}
          />

          {mediaUrl && (
            <div>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-12 text-ink-dim transition-colors hover:text-ink"
              >
                <ExternalLink className="size-3.5" />
                <Text path="library.lineups.media" />
              </a>
            </div>
          )}

          <details className="rounded-card border border-line bg-surface-1 p-3 text-11 text-ink-dim">
            <summary className="cursor-pointer font-medium text-ink">
              <Text path="library.lineups.form.technicalDetails" />
            </summary>
            <div className="mt-2 flex flex-col gap-1 font-mono">
              <span>
                <Text path="library.lineups.form.map" />: {lineup.map}
              </span>
              <span>
                <Text path="library.lineups.form.origin" />: {lineup.origin.x.toFixed(2)},{' '}
                {lineup.origin.y.toFixed(2)}, {lineup.origin.z.toFixed(2)}
              </span>
              <span>
                <Text path="library.lineups.form.landing" />: {lineup.landing.x.toFixed(2)},{' '}
                {lineup.landing.y.toFixed(2)}, {lineup.landing.z.toFixed(2)}
              </span>
              {isFromDemo && (
                <>
                  <span>
                    <Text path="library.lineups.form.pitch" />: {lineup.pitch.toFixed(2)}°
                  </span>
                  <span>
                    <Text path="library.lineups.form.yaw" />: {lineup.yaw.toFixed(2)}°
                  </span>
                </>
              )}
            </div>
          </details>
        </div>

        <div className="flex items-center justify-end border-t border-line px-5 py-3">
          <Button variant="secondary" onClick={onDismiss} className="h-8 px-4 text-12">
            <Text path="library.lineups.form.close" />
          </Button>
        </div>
      </Dialog>

      <LineupImageZoomDialog
        title={lineup.title}
        url={zoomedImageUrl}
        onClose={() => setZoomedImageUrl(null)}
      />
    </>
  );
}
