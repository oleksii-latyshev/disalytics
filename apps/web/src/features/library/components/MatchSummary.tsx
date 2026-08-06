import type { ParsedDemo } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { Button } from '@/shared/components/ui/button';
import { DemoFileName } from './DemoFileName';

interface Props {
  demo: ParsedDemo;
  fileName: string;
  onClose: () => void;
}

export function MatchSummary({ demo, fileName, onClose }: Props) {
  const { header, events } = demo;

  return (
    <section className="flex flex-col gap-4 rounded-instrument border border-line bg-surface-1 p-6">
      <h2 className="font-ui text-20 leading-dense">
        <Text path="library.summary.title" />
      </h2>

      <DemoFileName fileName={fileName} />

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className="label-dense">
          <Text path="library.map" />
        </span>
        <span className="text-14">{header.map}</span>
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-13 text-ink-dim">
        <li className="numeric">
          <Text path="library.counts.players" values={{ count: header.players.length }} />
        </li>
        <li className="numeric">
          <Text path="library.counts.rounds" values={{ count: events.rounds.length }} />
        </li>
        <li className="numeric">
          <Text path="library.counts.kills" values={{ count: events.kills.length }} />
        </li>
        <li className="numeric">
          <Text path="library.counts.grenades" values={{ count: events.grenades.length }} />
        </li>
      </ul>

      <Button type="button" variant="outline" className="self-start" onClick={onClose}>
        <Text path="library.summary.action" />
      </Button>
    </section>
  );
}
