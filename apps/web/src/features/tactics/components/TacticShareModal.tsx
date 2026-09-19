import { encodeTacticToHash, type Tactic } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Check, Copy, Download, Link2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export interface TacticShareModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly tactic: Tactic;
  readonly onExportFile?: () => void;
}

export function TacticShareModal({ isOpen, onClose, tactic, onExportFile }: TacticShareModalProps) {
  const t = useT();
  const [isCopied, setIsCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const hash = encodeTacticToHash(tactic);
    return `${origin}${pathname}${hash}`;
  }, [tactic]);

  useEffect(() => {
    if (!isOpen) {
      setIsCopied(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Clipboard write permission refused
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tactic-share-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label={t('library.tactics.share.close')}
        onClick={onClose}
        className="fixed inset-0 bg-surface-0/80 backdrop-blur-sm cursor-default"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex w-full max-w-lg flex-col gap-4 rounded-card border border-line bg-surface-1 p-6 text-ink shadow-float">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2
              id="tactic-share-title"
              className="flex items-center gap-2 font-ui text-20 font-medium leading-dense"
            >
              <Link2 className="h-5 w-5 text-ink-dim" />
              <span>{t('library.tactics.share.title')}</span>
            </h2>
            <p className="text-13 text-ink-dim leading-prose">
              {t('library.tactics.share.subtitle')}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('library.tactics.share.close')}
            className="h-8 w-8 text-ink-dim hover:text-ink"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tactic Info Pill */}
        <div className="flex items-center gap-2 rounded-chip border border-line/60 bg-surface-0 px-3 py-2 text-xs">
          <span className="font-semibold text-ink">{tactic.title}</span>
          <span className="text-ink-faint">·</span>
          <span className="font-mono text-ink-dim">{tactic.map}</span>
          <span className="text-ink-faint">·</span>
          <span
            className={`font-mono font-semibold ${tactic.side === 'CT' ? 'text-ct' : 'text-t'}`}
          >
            {tactic.side}
          </span>
        </div>

        {/* Link Input & Copy Button */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              aria-label={t('library.tactics.share.title')}
              className="flex-1 rounded-chip border border-line bg-surface-2 px-3 py-2 font-mono text-11 text-ink focus:border-white focus:outline-none select-all"
            />
            <Button
              variant={isCopied ? 'outline' : 'primary'}
              onClick={handleCopy}
              className="h-9 gap-1.5 px-3 text-xs"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-ink" />
                  <span>{t('library.tactics.share.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{t('library.tactics.share.copyLink')}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 [border-block-start:1px_solid_var(--color-line)] pt-3">
          {onExportFile !== undefined ? (
            <Button
              variant="outline"
              onClick={onExportFile}
              className="h-8 gap-1.5 px-3 text-xs text-ink-dim hover:text-ink"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{t('library.tactics.share.downloadFile')}</span>
            </Button>
          ) : (
            <div />
          )}

          <Button
            variant="ghost"
            onClick={onClose}
            className="h-8 px-3 text-xs text-ink-dim hover:text-ink"
          >
            {t('library.tactics.share.close')}
          </Button>
        </div>
      </div>
    </div>
  );
}
