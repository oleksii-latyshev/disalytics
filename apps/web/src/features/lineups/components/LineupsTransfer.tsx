import { Text, useT } from '@disa/i18n';
import { Button, Popover, PopoverPanel, PopoverTrigger } from '@disa/ui';
import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ImportResult } from '../hooks/use-map-lineups';

type Outcome =
  | { readonly kind: 'imported'; readonly lineups: number; readonly collections: number }
  | { readonly kind: 'failed' };

interface Props {
  mapName: string;
  /** How many lineups on this map are the user's own, and would go into a file. */
  ownCount: number;
  /** How many collections this map has, which go into the file as well. */
  collectionCount: number;
  onExport: () => Promise<void>;
  onImport: (file: File) => Promise<ImportResult>;
}

const ACTION =
  'flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-card px-3 py-2 text-left transition-colors duration-(--duration-micro) ease-out disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Import and export, with the one thing a reader needs to know before either: lineups are kept in
 * this browser and nowhere else, and a file is how they move.
 */
export function LineupsTransfer({ mapName, ownCount, collectionCount, onExport, onImport }: Props) {
  const t = useT();
  const fileInput = useRef<HTMLInputElement>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;

    try {
      setOutcome({ kind: 'imported', ...(await onImport(file)) });
    } catch {
      setOutcome({ kind: 'failed' });
    }
  };

  return (
    <Popover onOpenChange={() => setOutcome(null)}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="gap-2">
            <Upload aria-hidden="true" className="size-4" />
            <Text path="library.lineups.transfer.open" />
          </Button>
        }
      />

      <PopoverPanel
        align="end"
        className="surface-card flex w-85 flex-col gap-3 rounded-float border-0 p-4 shadow-none"
      >
        <h2 className="font-semibold text-14 text-ink">
          <Text path="library.lineups.transfer.title" />
        </h2>
        <p className="text-13 text-ink-dim leading-prose">
          <Text path="library.lineups.transfer.body" />
        </p>

        <button
          type="button"
          disabled={ownCount === 0 && collectionCount === 0}
          onClick={() => void onExport()}
          className={`${ACTION} bg-ink text-surface-0`}
        >
          <Download aria-hidden="true" className="size-4 shrink-0" />
          <span className="flex min-w-0 flex-col gap-px">
            <span className="font-semibold text-13">
              <Text path="library.lineups.transfer.save" values={{ map: mapName }} />
            </span>
            <span className="text-11 opacity-70">
              {ownCount === 0 && collectionCount === 0 && (
                <Text path="library.lineups.transfer.saveNone" />
              )}
              {ownCount > 0 && (
                <Text path="library.lineups.transfer.saveCount" values={{ count: ownCount }} />
              )}
              {collectionCount > 0 && (
                <>
                  {ownCount > 0 && ' + '}
                  <Text
                    path="library.lineups.transfer.saveCollections"
                    values={{ count: collectionCount }}
                  />
                </>
              )}
            </span>
          </span>
        </button>

        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          onChange={(event) => void handleFile(event)}
          className="hidden"
          aria-label={t('library.lineups.transfer.import')}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className={`${ACTION} border border-line-strong text-ink hover:bg-hover`}
        >
          <Upload aria-hidden="true" className="size-4 shrink-0" />
          <span className="flex min-w-0 flex-col gap-px">
            <span className="font-semibold text-13">
              <Text path="library.lineups.transfer.import" />
            </span>
            <span className="text-11 text-ink-dim">
              <Text path="library.lineups.transfer.importHint" />
            </span>
          </span>
        </button>

        {outcome !== null && (
          <p role="status" className="text-12 text-ink">
            {outcome.kind === 'imported' ? (
              <>
                {(outcome.lineups > 0 || outcome.collections === 0) && (
                  <Text path="library.lineups.importSuccess" values={{ count: outcome.lineups }} />
                )}{' '}
                {outcome.collections > 0 && (
                  <Text
                    path="library.lineups.importCollections"
                    values={{ count: outcome.collections }}
                  />
                )}
              </>
            ) : (
              <Text path="library.lineups.importError" />
            )}
          </p>
        )}

        <p className="text-11 text-ink-faint leading-prose">
          <Text path="library.lineups.transfer.builtIn" />
        </p>
      </PopoverPanel>
    </Popover>
  );
}
