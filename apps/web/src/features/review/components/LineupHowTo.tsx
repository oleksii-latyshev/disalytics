import type { LineupVariant } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  variant: LineupVariant;
  /** Where to stand, as a callout. */
  from: string;
  hz: number;
}

const COPIED_MS = 2000;

/**
 * Everything needed to throw a variant again: where to stand, how, and the console command that puts
 * you there. The command is the throw's own recorded position and aim — sampled, and said to be.
 */
export function LineupHowTo({ variant, from, hz }: Props) {
  const t = useT();
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const isCopied = copiedCommand === variant.command;

  useEffect(() => {
    if (copiedCommand === null) return;
    const timer = setTimeout(() => setCopiedCommand(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copiedCommand]);

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(variant.command);
      setCopiedCommand(variant.command);
    } catch {
      setCopiedCommand(null);
    }
  }

  return (
    <section className="flex flex-col gap-2.5 rounded-card bg-surface-2 p-3">
      <h3 className="label-dense text-ink-dim">
        <Text path="review.lineups.howTo.title" />
      </h3>

      <dl className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-x-2 gap-y-2.5 text-13">
        <dt className="text-ink-dim">
          <Text path="review.lineups.howTo.stand" />
        </dt>
        <dd>{from}</dd>

        <dt className="text-ink-dim">
          <Text path="review.lineups.howTo.throw" />
        </dt>
        <dd className="flex flex-wrap items-center gap-1">
          <span>
            <Text path={`review.maps.throw.types.${variant.throwType}`} />
          </span>
          {variant.movementKeys
            .filter((key) => key !== 'Stand')
            .map((key) => (
              <kbd
                key={key}
                className="rounded-chip border border-line-strong bg-surface-3 px-1.5 font-mono text-11 text-ink"
              >
                {key === 'Jump' ? t('review.lineups.keys.jump') : key}
              </kbd>
            ))}
        </dd>

        <dt className="text-ink-dim">
          <Text path="review.lineups.howTo.console" />
        </dt>
        <dd className="flex min-w-0 items-center gap-1.5">
          <code
            title={variant.command}
            className="min-w-0 flex-1 select-all truncate font-mono text-11 text-ink"
          >
            {variant.command}
          </code>
          <Button
            variant="outline"
            size="default"
            onClick={handleCopy}
            className="h-7 px-2.5 text-12"
          >
            {isCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            <Text path={isCopied ? 'review.lineups.howTo.copied' : 'review.lineups.howTo.copy'} />
          </Button>
        </dd>
      </dl>

      <p className="text-11 text-ink-dim leading-prose">
        <Text path="review.lineups.howTo.approximate" values={{ hz }} />
      </p>
    </section>
  );
}
