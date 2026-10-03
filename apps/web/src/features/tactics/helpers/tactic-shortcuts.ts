import type { TacticTool } from '../hooks/use-tactic-editor';

function handleToolShortcut(key: string, onSelectTool: (tool: TacticTool) => void): boolean {
  if (key === '1') {
    onSelectTool('select');
    return true;
  }
  if (key === '2') {
    onSelectTool('pencil');
    return true;
  }
  if (key === '3') {
    onSelectTool('throw');
    return true;
  }
  if (key === '4') {
    onSelectTool('eraser');
    return true;
  }
  return false;
}

function handleNavigationShortcut(
  event: KeyboardEvent,
  togglePlay: () => void,
  jumpStep: (dir: 'prev' | 'next') => void,
): boolean {
  if (event.code === 'Space') {
    event.preventDefault();
    togglePlay();
    return true;
  }
  if (event.key === 'ArrowLeft' || event.key === '[') {
    event.preventDefault();
    jumpStep('prev');
    return true;
  }
  if (event.key === 'ArrowRight' || event.key === ']') {
    event.preventDefault();
    jumpStep('next');
    return true;
  }
  return false;
}

function handleModifierShortcut(
  event: KeyboardEvent,
  undo: () => void,
  redo: () => void,
  onSave: () => void,
): boolean {
  if (!event.ctrlKey && !event.metaKey) return false;
  const key = event.key.toLowerCase();

  if (key === 'z') {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return true;
  }
  if (key === 'y') {
    event.preventDefault();
    redo();
    return true;
  }
  if (key === 's') {
    event.preventDefault();
    onSave();
    return true;
  }
  return false;
}

export interface TacticShortcutActions {
  readonly undo: () => void;
  readonly redo: () => void;
  readonly save: () => void;
  readonly togglePlay: () => void;
  readonly jumpStep: (dir: 'prev' | 'next') => void;
  readonly selectTool: (tool: TacticTool) => void;
}

/** Whether the keys belong to what has focus: a text field, a menu, or an editable region. A range slider does not keep them, so the arrows keep stepping after it was dragged. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement) return target.type !== 'range';
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLElement && target.isContentEditable;
}

export function handleTacticShortcut(event: KeyboardEvent, actions: TacticShortcutActions): void {
  if (event.defaultPrevented || isTypingTarget(event.target)) return;
  if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return;
  if ((event.altKey || event.shiftKey) && !event.ctrlKey && !event.metaKey) return;

  if (handleModifierShortcut(event, actions.undo, actions.redo, actions.save)) return;
  if (handleNavigationShortcut(event, actions.togglePlay, actions.jumpStep)) return;
  handleToolShortcut(event.key, actions.selectTool);
}
