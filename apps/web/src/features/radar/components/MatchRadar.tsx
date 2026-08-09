import type { ParsedDemo } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { getMapOverview } from '@disa/map-data';
import type { Transport } from '@/core/playback';
import { RadarView } from './RadarView';
import { UnknownMap } from './UnknownMap';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
}

export function MatchRadar({ demo, transport }: Props) {
  const overview = getMapOverview(demo.header.map);

  return (
    <section className="flex flex-col gap-4 rounded-instrument border border-line bg-surface-1 p-6">
      <h2 className="font-ui text-20 leading-dense">
        <Text path="radar.title" />
      </h2>

      {overview === undefined ? (
        <UnknownMap map={demo.header.map} />
      ) : (
        <RadarView demo={demo} overview={overview} transport={transport} />
      )}
    </section>
  );
}
