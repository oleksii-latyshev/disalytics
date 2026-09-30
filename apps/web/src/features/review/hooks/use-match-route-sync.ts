import { roundOpeningFrame } from '@disa/demo-core';
import { useEffect, useRef } from 'react';
import { type RoundSyncState, receiveTransportRound, receiveUrlRound } from '@/core/navigation';
import type { Transport } from '@/core/playback';

interface Options {
  demo: Parameters<typeof roundOpeningFrame>[0];
  transport: Transport;
  urlRound: number;
  transportRound: number | undefined;
  onRoundChange: (round: number) => void;
}

export function useMatchRouteSync({
  demo,
  transport,
  urlRound,
  transportRound,
  onRoundChange,
}: Options): void {
  const state = useRef<RoundSyncState>({
    urlRound,
    pendingUrlWrites: [],
    pendingSeekRound: null,
  });

  useEffect(() => {
    if (transportRound === undefined) return;
    const result = receiveUrlRound(state.current, urlRound, transportRound);
    state.current = result.state;
    if (result.seekRound !== null) {
      transport.pause();
      transport.seek(roundOpeningFrame(demo, result.seekRound - 1));
    }
  }, [demo, transport, transportRound, urlRound]);

  useEffect(() => {
    if (transportRound === undefined) return;
    const result = receiveTransportRound(state.current, transportRound);
    state.current = result.state;
    if (result.writeRound !== null) onRoundChange(result.writeRound);
  }, [onRoundChange, transportRound]);
}
