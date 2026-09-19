import type { Lineup, LineupSide } from '@disa/demo-core';
import { UTILITY_NAMES } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Check, Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UtilityGlyph } from '@/core/glyphs';

interface Props {
  readonly lineup: Lineup | null;
  readonly onDelete?: ((id: string) => void) | undefined;
  readonly onEdit?: ((lineup: Lineup) => void) | undefined;
}

const SIDE_STYLES: Readonly<Record<LineupSide, string>> = {
  CT: 'text-ct border-ct/30 bg-ct/10',
  T: 'text-t border-t/30 bg-t/10',
  BOTH: 'text-ink border-line bg-surface-3',
};

export function LineupDetailCard({ lineup, onDelete, onEdit }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  if (lineup === null) {
    return (
      <div className="surface-card flex min-h-[12rem] flex-col items-center justify-center rounded-float p-6 text-center text-ink-dim">
        <p className="text-13 leading-prose">
          <Text path="library.lineups.noLineupSelected" />
        </p>
      </div>
    );
  }

  const handleCopy = async () => {
    if (!lineup.command) return;
    try {
      await navigator.clipboard.writeText(lineup.command);
      setCopied(true);
    } catch {
      // Ignore clipboard failure in non-secure contexts
    }
  };

  const handleDelete = () => {
    if (onDelete !== undefined && !lineup.isBuiltIn) {
      if (window.confirm(t('library.lineups.deleteConfirm'))) {
        onDelete(lineup.id);
      }
    }
  };

  return (
    <div className="surface-card flex flex-col gap-3 rounded-float p-4">
      {/* Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-chip border px-1.5 py-0.5 font-medium text-11 ${
                SIDE_STYLES[lineup.side]
              }`}
            >
              {lineup.side === 'BOTH' ? <Text path="library.lineups.bothSides" /> : lineup.side}
            </span>

            <span className="flex items-center gap-1 rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-11 text-ink">
              <UtilityGlyph kind={lineup.kind} label={UTILITY_NAMES[lineup.kind]} size="control" />
              <span>{UTILITY_NAMES[lineup.kind]}</span>
            </span>

            <span className="rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 text-11 text-ink-dim">
              <Text path={`review.maps.throw.types.${lineup.throwType}`} />
            </span>

            <span className="rounded-chip border border-line bg-surface-1 px-1.5 py-0.5 text-11 text-ink-dim">
              <Text
                path={lineup.isBuiltIn ? 'library.lineups.builtIn' : 'library.lineups.custom'}
              />
            </span>
          </div>

          {!lineup.isBuiltIn && (
            <div className="flex items-center gap-1">
              {onEdit !== undefined && (
                <button
                  type="button"
                  onClick={() => onEdit(lineup)}
                  title={t('library.lineups.edit')}
                  aria-label={t('library.lineups.edit')}
                  className="rounded-chip p-1 text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  <Pencil className="size-3.5" />
                </button>
              )}
              {onDelete !== undefined && (
                <button
                  type="button"
                  onClick={handleDelete}
                  title={t('library.lineups.delete')}
                  aria-label={t('library.lineups.delete')}
                  className="rounded-chip p-1 text-ink-dim transition-colors hover:bg-surface-3 hover:text-ink"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <h3 className="font-ui font-medium text-16 text-ink leading-dense">{lineup.title}</h3>
      </div>

      {/* Movement & Target details */}
      <div className="flex flex-col gap-1 text-12">
        {lineup.movementKeys && lineup.movementKeys.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="label-dense text-ink-dim">
              <Text path="library.lineups.movement" />:
            </span>
            <div className="flex flex-wrap items-center gap-1">
              {lineup.movementKeys.map((key) => (
                <kbd
                  key={key}
                  className="rounded-chip border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-11 text-ink"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        )}

        {lineup.notes && <p className="text-12 text-ink-dim leading-prose">{lineup.notes}</p>}
      </div>

      {/* Console command with copy button */}
      {lineup.command && (
        <div className="flex flex-col gap-1.5">
          <span className="label-dense text-11 text-ink-dim">
            <Text path="library.lineups.command" />
          </span>
          <div className="flex items-center gap-1.5 rounded-card border border-line bg-surface-1 p-1.5">
            <code className="min-w-0 flex-1 truncate font-mono text-11 text-ink selection:bg-surface-3">
              {lineup.command}
            </code>
            <Button
              variant="secondary"
              onClick={handleCopy}
              className="h-6 shrink-0 gap-1 px-2 text-11"
            >
              {copied ? (
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

      {/* External media guide link */}
      {lineup.mediaUrl && (
        <a
          href={lineup.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-12 text-ink-dim transition-colors hover:text-ink"
        >
          <ExternalLink className="size-3.5" />
          <Text path="library.lineups.media" />
        </a>
      )}
    </div>
  );
}
