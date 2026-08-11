import type { MatchHeader } from '@disa/demo-core';
import type { ParsePhase } from '@disa/demo-parser';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { DemoFileName } from './DemoFileName';

interface Props {
  fileName: string;
  phase: ParsePhase;
  percent: number;
  header: MatchHeader | null;
  onCancel: () => void;
}

export function ParseProgress({ fileName, phase, percent, header, onCancel }: Props) {
  const t = useT();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-ui text-20 leading-dense">
          <Text path="library.progress.title" />
        </h2>
        <span className="numeric text-13 text-ink-dim">
          <Text path="library.progress.percent" values={{ percent: percent / 100 }} />
        </span>
      </div>

      <DemoFileName fileName={fileName} />

      <div
        role="progressbar"
        aria-label={t('library.progress.label')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1 overflow-hidden rounded-chip bg-surface-2"
      >
        {/* A transform rather than a width: the bar advances while the worker holds the demo, and
            AGENTS.md §17.1 keeps everything but transform and opacity off the main thread. */}
        {/* Accent, per DESIGN.md §5 — this screen carries no side data, which is the whole reason
            §2's fence lets the accent live here. It reads 5.82:1 against the `--surface-2` track. */}
        <div
          className="h-full origin-left bg-accent transition-transform duration-(--duration-base) ease-out"
          style={{ transform: `scaleX(${percent / 100})` }}
        />
      </div>

      <p className="label-dense">
        <Text
          path={
            phase === 'decompress'
              ? 'library.progress.phase.decompress'
              : 'library.progress.phase.parse'
          }
        />
      </p>

      {/* The header is complete while the last pass is still running, so it is worth showing
          before the demo is. */}
      {header !== null && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="label-dense">
            <Text path="library.map" />
          </span>
          <span className="text-14">{header.map}</span>
          <span className="numeric text-13 text-ink-dim">
            <Text path="library.counts.players" values={{ count: header.players.length }} />
          </span>
        </div>
      )}

      <Button type="button" variant="outline" className="self-start" onClick={onCancel}>
        <Text path="library.progress.cancel" />
      </Button>
    </section>
  );
}
