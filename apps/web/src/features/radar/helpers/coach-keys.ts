export type CoachKeyIntent = 'undo' | 'redo';

interface KeyPress {
  readonly key: string;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
}

export function coachKeyIntent(press: KeyPress): CoachKeyIntent | null {
  if (!(press.metaKey || press.ctrlKey) || press.altKey) return null;

  const key = press.key.toLowerCase();
  if (key === 'y') return 'redo';
  if (key !== 'z') return null;

  return press.shiftKey ? 'redo' : 'undo';
}
