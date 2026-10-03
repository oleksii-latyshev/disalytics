import { useT } from '@disa/i18n';
import { Button, Popover, PopoverPanel, PopoverTrigger } from '@disa/ui';
import {
  Bomb,
  BookmarkMinus,
  BookmarkPlus,
  Cloud,
  Eraser,
  Flame,
  Move,
  Pencil,
  Redo2,
  Trash2,
  Undo2,
  Zap,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useSetting } from '@/core/settings';
import type { CoachSession } from '../helpers/coach-session';
import {
  COACH_PENCIL_COLORS,
  type CoachTool,
  EMPTY_COACH_ANNOTATIONS,
  resolvePencilColor,
} from '../helpers/coach-types';
import { radarColors } from '../helpers/colors';
import { useCoachState } from '../hooks/use-coach-session';

interface Props {
  readonly session: CoachSession;
  readonly isVisible: boolean;
  /** Whether the round the plate is paused in carries a saved note. */
  readonly hasNote: boolean;
  readonly onSaveNote: () => void;
  readonly onDeleteNote: () => void;
}

const TOOLS: readonly { readonly tool: CoachTool; readonly icon: ReactNode }[] = [
  { tool: 'move', icon: <Move /> },
  { tool: 'pencil', icon: <Pencil /> },
  { tool: 'eraser', icon: <Eraser /> },
  { tool: 'smoke', icon: <Cloud /> },
  { tool: 'molotov', icon: <Flame /> },
  { tool: 'flash', icon: <Zap /> },
  { tool: 'he', icon: <Bomb /> },
];

const BUTTON = 'size-6 rounded-chip';

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-4 w-px bg-line" />;
}

export function CoachBrow({ session, isVisible, hasNote, onSaveNote, onDeleteNote }: Props) {
  const t = useT();
  const [palette] = useSetting('palette');
  const [isColorOpen, setColorOpen] = useState(false);
  const { tool, color, history } = useCoachState(session);
  const colors = radarColors(palette);
  const hasDrawings = history.present !== EMPTY_COACH_ANNOTATIONS;

  return (
    <div
      role="toolbar"
      aria-label={t('radar.coach.label')}
      inert={!isVisible}
      className={`surface-brow absolute bottom-full left-4 z-1 flex h-8 items-center gap-0.5 rounded-t-card px-2 transition-opacity duration-(--duration-base) ease-out ${
        isVisible ? '' : 'pointer-events-none opacity-0'
      }`}
    >
      {TOOLS.map((entry) => (
        <Button
          key={entry.tool}
          type="button"
          variant={tool === entry.tool ? 'secondary' : 'ghost'}
          size="icon"
          className={BUTTON}
          aria-label={t(`radar.coach.tools.${entry.tool}`)}
          title={t(`radar.coach.tools.${entry.tool}`)}
          aria-pressed={tool === entry.tool}
          onClick={() => session.toggleTool(entry.tool)}
        >
          {entry.icon}
        </Button>
      ))}

      <Divider />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={BUTTON}
        aria-label={t('radar.coach.tools.undo')}
        title={t('radar.coach.tools.undo')}
        disabled={history.past.length === 0}
        onClick={session.undo}
      >
        <Undo2 />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={BUTTON}
        aria-label={t('radar.coach.tools.redo')}
        title={t('radar.coach.tools.redo')}
        disabled={history.future.length === 0}
        onClick={session.redo}
      >
        <Redo2 />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={BUTTON}
        aria-label={t('radar.coach.tools.clear')}
        title={t('radar.coach.tools.clear')}
        disabled={!hasDrawings}
        onClick={session.clear}
      >
        <Trash2 />
      </Button>

      <Divider />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={BUTTON}
        aria-label={t('radar.coach.tools.saveNote')}
        title={t('radar.coach.tools.saveNote')}
        disabled={!hasDrawings}
        onClick={onSaveNote}
      >
        <BookmarkPlus />
      </Button>
      {hasNote && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={BUTTON}
          aria-label={t('radar.coach.tools.deleteNote')}
          title={t('radar.coach.tools.deleteNote')}
          onClick={onDeleteNote}
        >
          <BookmarkMinus />
        </Button>
      )}

      <Divider />

      <Popover open={isColorOpen && isVisible} onOpenChange={setColorOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={BUTTON}
              aria-label={`${t('radar.coach.color')}: ${t(`radar.coach.colors.${color}`)}`}
            >
              <span
                aria-hidden="true"
                className="size-3.5 rounded-full border border-line-strong"
                style={{ backgroundColor: resolvePencilColor(color, colors) }}
              />
            </Button>
          }
        />

        <PopoverPanel
          aria-label={t('radar.coach.color')}
          className="surface-card flex w-auto gap-1 rounded-card border-0 p-1.5 shadow-none"
        >
          {COACH_PENCIL_COLORS.map((name) => (
            <Button
              key={name}
              type="button"
              variant={name === color ? 'secondary' : 'ghost'}
              size="icon"
              className={BUTTON}
              aria-label={t(`radar.coach.colors.${name}`)}
              title={t(`radar.coach.colors.${name}`)}
              aria-pressed={name === color}
              onClick={() => {
                session.setColor(name);
                setColorOpen(false);
              }}
            >
              <span
                aria-hidden="true"
                className="size-3.5 rounded-full border border-line-strong"
                style={{ backgroundColor: resolvePencilColor(name, colors) }}
              />
            </Button>
          ))}
        </PopoverPanel>
      </Popover>
    </div>
  );
}
