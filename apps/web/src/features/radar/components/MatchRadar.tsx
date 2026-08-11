import type { ParsedDemo } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview } from '@disa/map-data';
import type { Transport } from '@/core/playback';
import { RadarView } from './RadarView';
import { UnknownMap } from './UnknownMap';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
}

export function MatchRadar({ demo, transport }: Props) {
  const t = useT();
  const overview = getMapOverview(demo.header.map);

  // No padding: the stage is the radar's whole cell, and `min(100cqi,100cqb)` spends every pixel of
  // it on the map — DESIGN.md §5. Chrome floats over the result rather than insetting it.
  return (
    <section aria-label={t('radar.title')} className="grid min-h-0 min-w-0 bg-surface-0">
      {overview === undefined ? (
        <UnknownMap map={demo.header.map} />
      ) : (
        <RadarView demo={demo} overview={overview} transport={transport} />
      )}
    </section>
  );
}
