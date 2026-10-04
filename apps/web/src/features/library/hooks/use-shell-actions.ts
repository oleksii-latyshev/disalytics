import { createContext, useContext } from 'react';

/** What the way-in's chrome owns and its screens may ask for: the two sheets the dock opens. */
export interface ShellActions {
  openHelp: () => void;
  openSettings: () => void;
}

const NOOP: ShellActions = { openHelp: () => undefined, openSettings: () => undefined };

export const ShellActionsContext = createContext<ShellActions>(NOOP);

export function useShellActions(): ShellActions {
  return useContext(ShellActionsContext);
}
