import { createContext, useContext } from 'react';
import type { DemoParse } from '@/core/parsing';

export interface RouterContext {
  parse: DemoParse;
  onUpdate: (() => void) | null;
  parseOrigin: { current: string | null };
}

export const AppRouteContext = createContext<RouterContext | null>(null);
export const ShellInteractionContext = createContext<boolean>(false);

export function useAppRouteContext(): RouterContext {
  const context = useContext(AppRouteContext);
  if (context === null) throw new Error('App route context is unavailable');
  return context;
}

export function useShellDragState(): boolean {
  return useContext(ShellInteractionContext);
}
