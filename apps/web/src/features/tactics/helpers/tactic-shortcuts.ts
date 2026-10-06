import type { TacticTool, ThrowKind } from './tactic-editor-state';

export type ShortcutCommand =
  | { readonly type: 'undo' }
  | { readonly type: 'redo' }
  | { readonly type: 'save' }
  | { readonly type: 'play' }
  | { readonly type: 'step'; readonly direction: 'prev' | 'next' }
  | { readonly type: 'tool'; readonly tool: TacticTool }
  | { readonly type: 'grenade'; readonly kind: ThrowKind }
  | { readonly type: 'player'; readonly slot: number }
  | { readonly type: 'removePoint' };

export interface KeyPress {
  readonly key: string;
  readonly code: string;
  readonly ctrl: boolean;
  readonly shift: boolean;
  readonly alt: boolean;
}

const TOOL_KEYS: Readonly<Record<string, ShortcutCommand>> = {
  v: { type: 'tool', tool: 'select' },
  r: { type: 'tool', tool: 'route' },
  p: { type: 'tool', tool: 'pen' },
  s: { type: 'grenade', kind: 'smoke' },
  f: { type: 'grenade', kind: 'flash' },
  m: { type: 'grenade', kind: 'fire' },
  h: { type: 'grenade', kind: 'he' },
  escape: { type: 'tool', tool: 'select' },
};

function modified(press: KeyPress): ShortcutCommand | null {
  switch (press.key.toLowerCase()) {
    case 'z':
      return { type: press.shift ? 'redo' : 'undo' };
    case 'y':
      return { type: 'redo' };
    case 's':
      return { type: 'save' };
    default:
      return null;
  }
}

/** What a key press asks the board to do; null when it is not one of the board's keys. */
export function resolveShortcut(press: KeyPress): ShortcutCommand | null {
  if (press.ctrl) return modified(press);
  if (press.alt || press.shift) return null;

  if (press.code === 'Space') return { type: 'play' };
  if (press.key === 'ArrowLeft' || press.key === '[') return { type: 'step', direction: 'prev' };
  if (press.key === 'ArrowRight' || press.key === ']') return { type: 'step', direction: 'next' };
  if (press.key === 'Delete' || press.key === 'Backspace') return { type: 'removePoint' };

  const digit = Number(press.key);
  if (Number.isInteger(digit) && digit >= 1 && digit <= 9)
    return { type: 'player', slot: digit - 1 };
  return TOOL_KEYS[press.key.toLowerCase()] ?? null;
}

export type TacticShortcutActions = {
  readonly [Command in ShortcutCommand as Command['type']]: (command: Command) => void;
};

/** Whether the keys belong to what has focus: a text field, a menu, or an editable region. A range slider does not keep them. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement) return target.type !== 'range';
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLElement && target.isContentEditable;
}

export function handleTacticShortcut(event: KeyboardEvent, actions: TacticShortcutActions): void {
  if (event.defaultPrevented || isTypingTarget(event.target)) return;
  const isButton = event.target instanceof HTMLButtonElement;
  if (event.code === 'Space' && isButton) return;

  const command = resolveShortcut({
    key: event.key,
    code: event.code,
    ctrl: event.ctrlKey || event.metaKey,
    shift: event.shiftKey,
    alt: event.altKey,
  });
  if (command === null) return;
  event.preventDefault();
  dispatch(command, actions);
}

function dispatch(command: ShortcutCommand, actions: TacticShortcutActions): void {
  switch (command.type) {
    case 'undo':
      actions.undo(command);
      break;
    case 'redo':
      actions.redo(command);
      break;
    case 'save':
      actions.save(command);
      break;
    case 'play':
      actions.play(command);
      break;
    case 'step':
      actions.step(command);
      break;
    case 'tool':
      actions.tool(command);
      break;
    case 'grenade':
      actions.grenade(command);
      break;
    case 'player':
      actions.player(command);
      break;
    case 'removePoint':
      actions.removePoint(command);
      break;
  }
}
