import { useRouterState } from '@tanstack/react-router';
import { nonReadyParseState } from '@/core/parsing';
import { HomeView } from '@/features/library';
import { useAppRouteContext, useShellDragState } from '../context';

export function HomePage() {
  const { parse, parseOrigin } = useAppRouteContext();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isDraggedOver = useShellDragState();
  const state = nonReadyParseState(parse.state);

  const openFile = (file: File) => {
    parseOrigin.current = pathname;
    parse.open(file);
  };
  const openSaved = (saved: Parameters<typeof parse.openSaved>[0], roundIndex: number) => {
    parseOrigin.current = pathname;
    parse.openSaved(saved, roundIndex);
  };
  const openSample = (sample: Parameters<typeof parse.openSample>[0]) => {
    parseOrigin.current = pathname;
    parse.openSample(sample);
  };

  return (
    <HomeView
      state={state}
      onFile={openFile}
      onClose={parse.close}
      isDraggedOver={isDraggedOver}
      onEnter={openSaved}
      onSample={openSample}
    />
  );
}
