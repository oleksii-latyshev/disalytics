import { useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { GitFork } from 'lucide-react';
import { type MouseEvent, useEffect, useRef, useState } from 'react';
import type { GraphNodeKey, PlanGraph } from '../helpers/tactic-plan-graph';
import type { TacticSchedule } from '../helpers/tactic-schedule';
import { PlanGraphView, STRIP_METRICS } from './PlanGraphView';
import { TacticStepMenu } from './TacticStepMenu';

export interface TacticPlanStripProps {
  readonly graph: PlanGraph;
  readonly schedules: ReadonlyMap<string, TacticSchedule>;
  /** The card of the step in view. */
  readonly selected: GraphNodeKey | null;
  readonly onOpen: (key: GraphNodeKey) => void;
  readonly onLane: (planId: string) => void;
  readonly onBranch: (key: GraphNodeKey) => void;
  readonly onAddStep: (planId: string) => void;
  readonly onDelete: (key: GraphNodeKey) => void;
  readonly deleteBlockOf: (key: GraphNodeKey) => string | null;
  readonly onOpenTree: () => void;
}

interface OpenMenu {
  readonly key: GraphNodeKey;
  readonly x: number;
  readonly y: number;
}

/** The plans as lanes under the map: each branch row leaves the step it branches after. */
export function TacticPlanStrip({
  graph,
  schedules,
  selected,
  onOpen,
  onLane,
  onBranch,
  onAddStep,
  onDelete,
  deleteBlockOf,
  onOpenTree,
}: TacticPlanStripProps) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLFieldSetElement>(null);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const selectedKey = selected === null ? '' : `${selected.planId}:${selected.index}`;

  useEffect(() => {
    if (selectedKey === '') return;
    const card = scroller.current?.querySelector('[aria-pressed="true"][tabindex="0"]');
    card?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedKey]);

  const handleMenu = (key: GraphNodeKey, event: MouseEvent<HTMLElement>) => {
    const box = root.current?.getBoundingClientRect();
    if (box === undefined) return;
    setMenu({ key, x: event.clientX - box.left, y: event.clientY - box.top });
  };

  const menuNode =
    menu === null
      ? undefined
      : graph.nodes.find((n) => n.planId === menu.key.planId && n.index === menu.key.index);
  const box = root.current?.getBoundingClientRect();

  return (
    <div ref={root} className="relative flex min-w-0 flex-col gap-1.5 px-3 pt-1 pb-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-12 text-ink-dim">{t('library.tactics.board.strip.label')}</span>
        <Button
          variant="outline"
          onClick={onOpenTree}
          title={t('library.tactics.board.tree.openTip')}
        >
          <GitFork aria-hidden="true" />
          {t('library.tactics.board.tree.open', { count: graph.rowCount })}
        </Button>
      </div>
      <fieldset
        ref={scroller}
        aria-label={t('library.tactics.board.strip.label')}
        className="m-0 max-h-56 min-w-0 overflow-auto rounded-card border border-line bg-surface-0 p-0"
      >
        <PlanGraphView
          graph={graph}
          metrics={STRIP_METRICS}
          variant="strip"
          schedules={schedules}
          selected={selected}
          onSelect={onOpen}
          onLane={onLane}
          onMenu={handleMenu}
          onBranch={onBranch}
          onAddStep={onAddStep}
        />
      </fieldset>
      {menu !== null && menuNode !== undefined && box !== undefined && (
        <TacticStepMenu
          point={menu}
          box={{ width: box.width, height: box.height }}
          stepIndex={menu.key.index}
          stepName={menuNode.step.name}
          deleteBlock={deleteBlockOf(menu.key)}
          onOpen={() => {
            setMenu(null);
            onOpen(menu.key);
          }}
          onBranch={() => {
            setMenu(null);
            onBranch(menu.key);
          }}
          onDelete={() => {
            setMenu(null);
            onDelete(menu.key);
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
