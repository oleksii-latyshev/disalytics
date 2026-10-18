import type { Tactic } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { usePlateSettings } from '@disa/plate';
import { Button } from '@disa/ui';
import { FileText, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useLineupCatalog } from '@/core/lineup-catalog';
import { saveDownload } from '../helpers/save-download';
import { tacticPdfFilename } from '../helpers/tactic-transfer';

type State = 'idle' | 'busy' | 'failed';

/**
 * Downloads one tactic as a PDF. The writer, its fonts and the lineup photos it needs are fetched on
 * the press and not before: nothing of it is in the screen the dialog opens from.
 */
export function TacticPdfButton({ tactic }: { readonly tactic: Tactic }) {
  const t = useT();
  const { palette, radarTheme, imageBase, imageCrossOrigin } = usePlateSettings();
  const { lineups } = useLineupCatalog(tactic.map);
  const [state, setState] = useState<State>('idle');

  const make = async () => {
    setState('busy');
    try {
      const { exportTacticPdf } = await import('@disa/tactic-board/pdf');
      const blob = await exportTacticPdf({
        tactic,
        t,
        lineups,
        palette,
        radarTheme,
        imageBase,
        imageCrossOrigin,
      });
      saveDownload({ filename: tacticPdfFilename(tactic), content: blob, type: 'application/pdf' });
      setState('idle');
    } catch {
      setState('failed');
    }
  };

  const isBusy = state === 'busy';
  return (
    <>
      <Button
        size="lg"
        variant="outline"
        onClick={make}
        disabled={isBusy}
        aria-busy={isBusy}
        className="flex-1 basis-40"
      >
        {isBusy ? (
          <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
        ) : (
          <FileText aria-hidden="true" />
        )}
        <Text path={isBusy ? 'library.tactics.pdf.busy' : 'library.tactics.pdf.download'} />
      </Button>
      {state === 'failed' && (
        <p role="alert" className="basis-full rounded-card border border-line p-3 text-13 text-ink">
          <Text path="library.tactics.pdf.failed" />
        </p>
      )}
    </>
  );
}
