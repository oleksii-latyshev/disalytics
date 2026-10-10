import type { Tactic } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button, Dialog } from '@disa/ui';
import { Minus, Plus, Undo2, X } from 'lucide-react';
import {
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  type GraphNodeKey,
  graphSize,
  nodeKey,
  type PlanGraph,
} from '../helpers/tactic-plan-graph';
import type { TacticSchedule } from '../helpers/tactic-schedule';
import { fitZoom, stepZoom, wheelZoom } from '../helpers/tactic-tree-zoom';
import { PlanGraphView, TREE_METRICS } from './PlanGraphView';
import { TacticStepMenu } from './TacticStepMenu';
import { TacticTreeSide } from './TacticTreeSide';

export interface TacticTreeDialogProps {
  readonly isOpen: boolean;
  readonly onDismiss: () => void;
  readonly tactic: Tactic;
  readonly graph: PlanGraph;
  readonly schedules: ReadonlyMap<string, TacticSchedule>;
  /** The step in view on the board, where the tree opens. */
  readonly selected: GraphNodeKey | null;
  readonly canUndo: boolean;
  readonly deleteBlockOf: (key: GraphNodeKey) => string | null;
  readonly onUndo: () => void;
  readonly onOpenStep: (key: GraphNodeKey) => void;
  readonly onBranch: (key: GraphNodeKey) => void;
  readonly onDeleteStep: (key: GraphNodeKey) => void;
  readonly onDeletePlan: (planId: string) => void;
}

/** Opening the tree never shrinks it past what can be read; Fit still goes lower. */
const OPEN_ZOOM_FLOOR = 0.6;

export function TacticTreeDialog(props: TacticTreeDialogProps) {
  const t = useT();
  return (
    <Dialog
      isOpen={props.isOpen}
      onDismiss={props.onDismiss}
      aria-label={t('library.tactics.board.tree.title')}
      data-shortcuts-suspended
      className="h-[min(88vh,52rem)] w-[min(96vw,92rem)] overflow-hidden"
    >
      <TreeBody {...props} />
    </Dialog>
  );
}

interface MenuAt {
  readonly key: GraphNodeKey;
  readonly x: number;
  readonly y: number;
}

function TreeBody({
  onDismiss,
  tactic,
  graph,
  schedules,
  selected,
  canUndo,
  deleteBlockOf,
  onUndo,
  onOpenStep,
  onBranch,
  onDeleteStep,
  onDeletePlan,
}: TacticTreeDialogProps) {
  const t = useT();
  const [pickedKey, setPicked] = useState<GraphNodeKey | null>(selected);
  const [zoom, setZoom] = useState(1);
  const [menu, setMenu] = useState<MenuAt | null>(null);
  const scroller = useRef<HTMLFieldSetElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const picked =
    graph.nodes.find(
      (n) => pickedKey !== null && n.planId === pickedKey.planId && n.index === pickedKey.index,
    ) ?? graph.nodes[0];
  const stepCount = tactic.plans.reduce((sum, plan) => sum + plan.steps.length, 0);

  useEffect(() => {
    const element = scroller.current;
    if (element === null) return;
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom((current) => wheelZoom(current, event.deltaY));
    };
    element.addEventListener('wheel', handleWheel, { passive: false });
    return () => element.removeEventListener('wheel', handleWheel);
  }, []);

  const fitToView = useCallback(
    (floor = 0) => {
      const width = scroller.current?.clientWidth ?? 0;
      setZoom(Math.max(floor, fitZoom(width - 48, graphSize(TREE_METRICS, graph, false).width)));
    },
    [graph],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: fits once, when the tree opens
  useEffect(() => {
    const frameId = requestAnimationFrame(() => fitToView(OPEN_ZOOM_FLOOR));
    return () => cancelAnimationFrame(frameId);
  }, []);

  const handlePanStart = (event: PointerEvent<HTMLFieldSetElement>) => {
    const element = scroller.current;
    if (element === null || (event.target as Element).closest('button') !== null) return;
    pan.current = {
      x: event.clientX,
      y: event.clientY,
      left: element.scrollLeft,
      top: element.scrollTop,
    };
    element.setPointerCapture(event.pointerId);
  };
  const handlePanMove = (event: PointerEvent<HTMLFieldSetElement>) => {
    const start = pan.current;
    const element = scroller.current;
    if (start === null || element === null) return;
    element.scrollLeft = start.left - (event.clientX - start.x);
    element.scrollTop = start.top - (event.clientY - start.y);
  };

  const handleMenu = (key: GraphNodeKey, event: MouseEvent<HTMLElement>) => {
    const box = frame.current?.getBoundingClientRect();
    if (box === undefined) return;
    setPicked(key);
    setMenu({ key, x: event.clientX - box.left, y: event.clientY - box.top });
  };

  const menuNode =
    menu === null
      ? undefined
      : graph.nodes.find((n) => n.planId === menu.key.planId && n.index === menu.key.index);
  const frameBox = frame.current?.getBoundingClientRect();

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 [border-block-end:1px_solid_var(--color-line)] lg:col-span-2">
        <h2 className="font-semibold text-20">{t('library.tactics.board.tree.title')}</h2>
        <span className="font-mono text-12 text-ink-faint">
          {t('library.tactics.board.tree.summary', { plans: graph.rowCount, steps: stepCount })}
        </span>
        <span className="flex-1" />
        <span className="hidden text-12 text-ink-faint xl:inline">
          {t('library.tactics.board.tree.hint')}
        </span>
        <Button
          variant="outline"
          size="icon"
          disabled={!canUndo}
          onClick={onUndo}
          aria-label={t('library.tactics.board.tree.undo')}
          title={t('library.tactics.board.tree.undo')}
        >
          <Undo2 aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onDismiss}
          aria-label={t('library.tactics.board.tree.close')}
          title={t('library.tactics.board.tree.close')}
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <div ref={frame} className="relative flex min-h-0 min-w-0">
        <fieldset
          ref={scroller}
          aria-label={t('library.tactics.board.tree.graph')}
          onPointerDown={handlePanStart}
          onPointerMove={handlePanMove}
          onPointerUp={() => {
            pan.current = null;
          }}
          className="m-0 min-h-0 min-w-0 flex-1 cursor-grab overflow-auto border-none p-6 active:cursor-grabbing"
        >
          <PlanGraphView
            graph={graph}
            metrics={TREE_METRICS}
            variant="tree"
            schedules={schedules}
            selected={picked === undefined ? null : picked}
            zoom={zoom}
            onSelect={setPicked}
            onLane={(planId) => {
              const first = graph.nodes.find((n) => n.planId === planId);
              if (first !== undefined) setPicked(first);
            }}
            onMenu={handleMenu}
          />
        </fieldset>
        <fieldset
          aria-label={t('library.tactics.board.tree.zoomGroup')}
          className="surface-card absolute right-3.5 bottom-3.5 m-0 flex items-center gap-0.5 rounded-card border-none p-1"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom((z) => stepZoom(z, -1))}
            aria-label={t('library.tactics.board.tree.zoomOut')}
          >
            <Minus aria-hidden="true" />
          </Button>
          <span className="min-w-12 text-center font-mono text-12 text-ink-dim">
            {t('library.tactics.board.tree.zoomLevel', { zoom })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom((z) => stepZoom(z, 1))}
            aria-label={t('library.tactics.board.tree.zoomIn')}
          >
            <Plus aria-hidden="true" />
          </Button>
          <Button variant="ghost" onClick={() => fitToView()}>
            {t('library.tactics.board.tree.fit')}
          </Button>
        </fieldset>
        <span className="pointer-events-none absolute bottom-4 left-4 text-11 text-ink-faint">
          {t('library.tactics.board.tree.wheelHint')}
        </span>
        {menu !== null && menuNode !== undefined && frameBox !== undefined && (
          <TacticStepMenu
            point={menu}
            box={{ width: frameBox.width, height: frameBox.height }}
            stepIndex={menu.key.index}
            stepName={menuNode.step.name}
            deleteBlock={deleteBlockOf(menu.key)}
            onOpen={() => onOpenStep(menu.key)}
            onBranch={() => {
              setMenu(null);
              onBranch(menu.key);
            }}
            onDelete={() => {
              setMenu(null);
              onDeleteStep(menu.key);
            }}
            onClose={() => setMenu(null)}
          />
        )}
      </div>

      {picked !== undefined && (
        <TacticTreeSide
          key={nodeKey(picked.planId, picked.index)}
          tactic={tactic}
          graph={graph}
          node={picked}
          schedule={schedules.get(picked.planId)}
          stepDeleteBlock={deleteBlockOf(picked)}
          onOpen={() => onOpenStep(picked)}
          onDeleteStep={() => onDeleteStep(picked)}
          onDeleteBranch={() => onDeletePlan(picked.planId)}
        />
      )}
    </div>
  );
}
