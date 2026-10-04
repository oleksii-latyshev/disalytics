import type { SavedDemo } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import { LockKeyhole, SlidersHorizontal } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import type { ParseState } from '@/core/parsing';
import type { SampleMatch } from '@/core/samples';
import {
  isDefaultLayout,
  moveAmong,
  reorder,
  resize,
  setShown,
  visiblePlacements,
} from '../../helpers/home-layout';
import { type WidgetId, type WidgetSize, widgetSpec } from '../../helpers/home-widgets';
import { useHomeData } from '../../hooks/use-home-data';
import { useHomeLayout } from '../../hooks/use-home-layout';
import { DemoLibrary } from '../DemoLibrary';
import { CoachWidget } from './CoachWidget';
import { CustomizePanel } from './CustomizePanel';
import { HeroWidget } from './HeroWidget';
import { HomeTile } from './HomeTile';
import { LineupWidget } from './LineupWidget';
import { OpenWidget } from './OpenWidget';
import { RecentWidget } from './RecentWidget';
import { StatsWidget } from './StatsWidget';
import { StripWidget } from './StripWidget';
import { TacticsWidget } from './TacticsWidget';
import type { WidgetProps } from './types';

interface Props {
  state: Exclude<ParseState, { status: 'ready' }>;
  onFile: (file: File) => void;
  onClose: () => void;
  isDraggedOver: boolean;
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onSample: (sample: SampleMatch) => void;
}

function widgetBody(id: WidgetId, props: WidgetProps): ReactNode {
  switch (id) {
    case 'hero':
      return <HeroWidget {...props} />;
    case 'stats':
      return <StatsWidget {...props} />;
    case 'tactics':
      return <TacticsWidget {...props} />;
    case 'lineup':
      return <LineupWidget {...props} />;
    case 'open':
      return <OpenWidget {...props} />;
    case 'recent':
      return <RecentWidget {...props} />;
    case 'coach':
      return <CoachWidget {...props} />;
    default:
      return <StripWidget id={id} data={props.data} />;
  }
}

export function HomeView({ state, onFile, onClose, isDraggedOver, onEnter, onSample }: Props) {
  const t = useT();
  const data = useHomeData();
  const [layout, setLayout, resetLayout] = useHomeLayout();
  const [isEditing, setIsEditing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [dragging, setDragging] = useState<WidgetId | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const hasMatches = data.demos !== null && data.demos.length > 0;
  const drawn = useMemo(() => visiblePlacements(layout, hasMatches), [layout, hasMatches]);
  const actions = useMemo(() => ({ onEnter, onSample, onFile }), [onEnter, onSample, onFile]);

  const move = (id: WidgetId, delta: -1 | 1) => {
    const next = moveAmong(layout, id, delta, drawn);
    if (next === layout) return;
    setLayout(next);
    const position = visiblePlacements(next, hasMatches).findIndex((entry) => entry.id === id) + 1;
    setAnnouncement(
      t('library.home.customize.moved', {
        widget: t(widgetSpec(id).titlePath),
        position,
        total: drawn.length,
      }),
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[85rem] flex-col gap-5 pt-1 md:pt-0">
      {state.status !== 'idle' && (
        <div className="atlas-upload flex max-w-[425px] flex-col gap-3 rounded-[13px] border border-line-strong bg-surface-1 p-[22px]">
          <DemoLibrary
            state={state}
            onFile={onFile}
            onClose={onClose}
            isDraggedOver={isDraggedOver}
          />
        </div>
      )}

      {isEditing ? (
        <CustomizePanel
          layout={layout}
          hasMatches={hasMatches}
          isGalleryOpen={isGalleryOpen}
          onGallery={() => setIsGalleryOpen((open) => !open)}
          onToggle={(id, isShown) => setLayout(setShown(layout, id, isShown))}
          onReset={() => {
            if (!isDefaultLayout(layout)) resetLayout();
          }}
          onDone={() => {
            setIsEditing(false);
            setIsGalleryOpen(false);
            setDragging(null);
          }}
        />
      ) : (
        <div className="flex items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="font-ui text-28 font-medium leading-dense md:text-44">
              <Text path={hasMatches ? 'library.home.title' : 'library.home.titleFirst'} />
            </h2>
            <p className="max-w-2xl text-14 text-ink-dim leading-prose">
              <Text path={hasMatches ? 'library.home.subtitle' : 'library.home.subtitleFirst'} />
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={t('library.home.customize.openLabel')}
            className="hidden h-10 shrink-0 items-center gap-2 rounded-card border border-line-strong bg-surface-1 px-3.5 text-14 font-medium text-ink transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:flex"
          >
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            <Text path="library.home.customize.open" />
          </button>
        </div>
      )}

      {data.demos === null ? (
        <div className="min-h-96" aria-busy="true" />
      ) : (
        <ul className="m-0 grid list-none auto-rows-[96px] grid-flow-dense grid-cols-2 gap-3 p-0 md:auto-rows-[112px] md:grid-cols-3 md:gap-4">
          {drawn.map((placement, index) => {
            const spec = widgetSpec(placement.id);

            return (
              <HomeTile
                key={placement.id}
                placement={placement}
                spec={spec}
                index={index}
                position={index + 1}
                isEditing={isEditing}
                isDragging={dragging === placement.id}
                isFirst={index === 0}
                isLast={index === drawn.length - 1}
                onDragStart={setDragging}
                onDragOver={(over) => {
                  if (dragging !== null && dragging !== over)
                    setLayout(reorder(layout, dragging, over));
                }}
                onDragEnd={() => setDragging(null)}
                onHide={(id) => setLayout(setShown(layout, id, false))}
                onResize={(id: WidgetId, size: WidgetSize) => setLayout(resize(layout, id, size))}
                onMove={move}
              >
                {widgetBody(placement.id, { size: placement.size, data, actions })}
              </HomeTile>
            );
          })}
        </ul>
      )}

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <footer className="flex flex-wrap items-center justify-center gap-2 pt-2 text-11 text-ink-dim leading-prose">
        <LockKeyhole aria-hidden="true" className="size-3.5" />
        <Text path="library.home.footer" />
      </footer>
    </div>
  );
}
