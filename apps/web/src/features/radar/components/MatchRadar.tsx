import type { ParsedDemo, PlayerSlot } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { getMapOverview } from '@disa/map-data';
import type { RowFocus } from '@/core/events';
import type { Transport } from '@/core/playback';
import { RadarView } from './RadarView';
import { UnknownMap } from './UnknownMap';

interface Props {
  demo: ParsedDemo;
  transport: Transport;
  selectedSlot: PlayerSlot | null;
  /** The feed row the reader is on — §5.4's other half, which the plate is the other end of. */
  focus: RowFocus | null;
  /** Something in the top layer owns the keyboard, so §6.3's two zoom keys stand down. */
  isSuspended: boolean;
}

export function MatchRadar({ demo, transport, selectedSlot, focus, isSuspended }: Props) {
  const t = useT();
  const overview = getMapOverview(demo.header.map);

  // No padding: the stage is the radar's whole cell, and `min(100cqi,100cqb)` spends every pixel of
  // it on the map — DESIGN.md §5. Chrome floats over the result rather than insetting it.
  return (
    <section aria-label={t('radar.title')} className="grid min-h-0 min-w-0 bg-surface-0">
      {overview === undefined ? (
        <UnknownMap map={demo.header.map} />
      ) : (
        <RadarView
          demo={demo}
          overview={overview}
          transport={transport}
          selectedSlot={selectedSlot}
          focus={focus}
          isSuspended={isSuspended}
        />
      )}
    </section>
  );
}
