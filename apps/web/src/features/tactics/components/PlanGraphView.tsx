import { useT } from '@disa/i18n';
import { cn } from '@disa/ui';
import { GitBranch, Plus } from 'lucide-react';
import { type KeyboardEvent, type MouseEvent, useRef } from 'react';
import {
  edgePath,
  type GraphDirection,
  type GraphLane,
  type GraphMetrics,
  type GraphNode,
  type GraphNodeKey,
  graphSize,
  moveInGraph,
  nodeKey,
  nodeOrigin,
  type PlanGraph,
} from '../helpers/tactic-plan-graph';
import { deadSlotNumbers, planTitle } from '../helpers/tactic-plan-labels';
import { formatRoundClock, type TacticSchedule } from '../helpers/tactic-schedule';

export const STRIP_METRICS: GraphMetrics = {
  nodeWidth: 176,
  nodeHeight: 68,
  colGap: 28,
  rowGap: 30,
  labelWidth: 150,
  padding: 8,
};

export const TREE_METRICS: GraphMetrics = {
  nodeWidth: 232,
  nodeHeight: 132,
  colGap: 44,
  rowGap: 26,
  labelWidth: 190,
  padding: 12,
};

const ARROWS: Readonly<Record<string, GraphDirection>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

export interface PlanGraphViewProps {
  readonly graph: PlanGraph;
  readonly metrics: GraphMetrics;
  readonly variant: 'strip' | 'tree';
  readonly schedules: ReadonlyMap<string, TacticSchedule>;
  /** The card that is open (strip) or picked (tree). */
  readonly selected: GraphNodeKey | null;
  readonly zoom?: number | undefined;
  readonly onSelect: (key: GraphNodeKey) => void;
  readonly onLane: (planId: string) => void;
  readonly onMenu: (key: GraphNodeKey, event: MouseEvent<HTMLElement>) => void;
  /** Strip only: a branch after a step, and a step at the end of a plan. */
  readonly onBranch?: ((key: GraphNodeKey) => void) | undefined;
  readonly onAddStep?: ((planId: string) => void) | undefined;
}

function findNode(graph: PlanGraph, key: GraphNodeKey): GraphNode | undefined {
  return graph.nodes.find((n) => n.planId === key.planId && n.index === key.index);
}

function GraphEdges({
  graph,
  metrics,
  isTree,
}: {
  readonly graph: PlanGraph;
  readonly metrics: GraphMetrics;
  readonly isTree: boolean;
}) {
  const size = graphSize(metrics, graph);
  return (
    <svg
      aria-hidden="true"
      width={size.width}
      height={size.height}
      className="pointer-events-none absolute top-0 left-0"
    >
      {graph.edges.map((edge) => {
        const from = findNode(graph, edge.from);
        const to = findNode(graph, edge.to);
        if (from === undefined || to === undefined) return null;
        return (
          <path
            key={`${edge.kind}:${edge.to.planId}:${edge.to.index}`}
            d={edgePath(
              metrics,
              nodeOrigin(metrics, from.row, from.col),
              nodeOrigin(metrics, to.row, to.col),
            )}
            fill="none"
            strokeWidth={isTree ? 2.5 : 2}
            strokeLinecap="round"
            className={edge.isOnPath ? 'stroke-ink' : 'stroke-line-strong'}
          />
        );
      })}
    </svg>
  );
}

interface Titles {
  readonly root: string;
  readonly branch: string;
}

function LaneRow({
  lane,
  metrics,
  titles,
  onLane,
  onAddStep,
}: {
  readonly lane: GraphLane;
  readonly metrics: GraphMetrics;
  readonly titles: Titles;
  readonly onLane: (planId: string) => void;
  readonly onAddStep: ((planId: string) => void) | undefined;
}) {
  const t = useT();
  const origin = nodeOrigin(metrics, lane.row, 0);
  const out = deadSlotNumbers(lane.plan);
  const name = planTitle(lane.plan, titles);
  const meta = laneMeta(t, lane, out);
  return (
    <>
      <button
        type="button"
        aria-pressed={lane.isCurrent}
        aria-label={t('library.tactics.board.strip.lane', { plan: name })}
        title={name}
        onClick={() => onLane(lane.planId)}
        style={{
          left: metrics.padding,
          top: origin.y,
          width: metrics.labelWidth - 12,
          height: metrics.nodeHeight,
        }}
        className={cn(
          'absolute flex items-center gap-2 rounded-card border px-2.5 text-left transition-colors',
          lane.isCurrent ? 'border-line-strong bg-surface-2' : 'border-transparent hover:bg-hover',
          !lane.isOnPath && 'opacity-70',
        )}
      >
        {lane.isRoot ? (
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-ink" />
        ) : (
          <GitBranch aria-hidden="true" className="size-3.5 shrink-0 text-ink-dim" />
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-semibold text-12">{name}</span>
          <span className="truncate font-mono text-11 text-ink-faint">{meta}</span>
        </span>
      </button>
      {onAddStep !== undefined && (
        <button
          type="button"
          onClick={() => onAddStep(lane.planId)}
          aria-label={t('library.tactics.board.strip.addStepTo', { plan: name })}
          title={t('library.tactics.board.strip.addStepTo', { plan: name })}
          style={{
            left: nodeOrigin(metrics, lane.row, lane.length).x,
            top: origin.y,
            width: 76,
            height: metrics.nodeHeight,
          }}
          className={cn(
            'absolute flex items-center justify-center gap-1.5 rounded-card border border-dashed text-13 transition-colors hover:bg-hover hover:text-ink',
            lane.isCurrent ? 'border-line-strong text-ink-dim' : 'border-line text-ink-faint',
          )}
        >
          <Plus aria-hidden="true" className="size-4" />
          {t('library.tactics.board.step.add')}
        </button>
      )}
    </>
  );
}

function laneMeta(t: ReturnType<typeof useT>, lane: GraphLane, out: readonly number[]): string {
  if (lane.isRoot) return t('library.tactics.board.strip.laneSteps', { count: lane.length });
  if (out.length === 0) {
    return t('library.tactics.board.strip.laneFrom', { index: lane.firstIndex });
  }
  return t('library.tactics.board.strip.laneFromOut', {
    index: lane.firstIndex,
    slots: out.join(', '),
  });
}

function AliveDots({ node }: { readonly node: GraphNode }) {
  return (
    <span className="mt-auto flex w-full items-center gap-1.5" aria-hidden="true">
      {node.alive.map((isAlive, slot) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: slots are positions
          key={slot}
          className={cn('size-2.5 rounded-full', isAlive ? undefined : 'border border-ink-faint')}
          style={isAlive ? { background: `var(--color-tactic-${slot + 1})` } : undefined}
        />
      ))}
      <span className="flex-1" />
      <span className="font-mono text-11 text-ink-faint">{node.step.throws.length}</span>
    </span>
  );
}

interface CardProps {
  readonly node: GraphNode;
  readonly metrics: GraphMetrics;
  readonly isTree: boolean;
  readonly isSelected: boolean;
  readonly isTabStop: boolean;
  readonly seconds: number;
  readonly planName: string;
  readonly register: (key: string, element: HTMLButtonElement | null) => void;
  readonly onSelect: (key: GraphNodeKey) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, node: GraphNode) => void;
  readonly onMenu: (key: GraphNodeKey, event: MouseEvent<HTMLElement>) => void;
}

function cardTone(isSelected: boolean, isOnPath: boolean): string {
  if (isSelected) return 'border-ink bg-surface-2';
  if (isOnPath) return 'border-line-strong bg-surface-1 hover:bg-hover';
  return 'border-line bg-surface-1 opacity-70 hover:bg-hover hover:opacity-100';
}

function GraphCard({
  node,
  metrics,
  isTree,
  isSelected,
  isTabStop,
  seconds,
  planName,
  register,
  onSelect,
  onKeyDown,
  onMenu,
}: CardProps) {
  const t = useT();
  const origin = nodeOrigin(metrics, node.row, node.col);
  const name =
    node.step.name.trim() || t('library.tactics.board.strip.unnamed', { index: node.index + 1 });
  const idea = node.step.idea?.trim() || t('library.tactics.board.strip.noIdea');
  const label = isTree
    ? t('library.tactics.board.tree.node', { plan: planName, index: node.index + 1, name })
    : t('library.tactics.board.strip.card', { index: node.index + 1, name });
  return (
    <button
      type="button"
      ref={(element) => register(node.key, element)}
      aria-pressed={isSelected}
      aria-label={label}
      tabIndex={isTabStop ? 0 : -1}
      title={isTree ? undefined : t('library.tactics.board.strip.menuHint')}
      onClick={() => onSelect(node)}
      onKeyDown={(event) => onKeyDown(event, node)}
      onContextMenu={(event) => {
        event.preventDefault();
        onMenu(node, event);
      }}
      style={{
        left: origin.x,
        top: origin.y,
        width: metrics.nodeWidth,
        height: metrics.nodeHeight,
      }}
      className={cn(
        'absolute flex flex-col overflow-hidden rounded-card border text-left transition-colors',
        isTree ? 'gap-1.5 p-3' : 'gap-1 p-2.5',
        cardTone(isSelected, node.isOnPath),
      )}
    >
      <span className="flex w-full items-center gap-2">
        <span
          className={cn(
            'grid size-5 shrink-0 place-items-center rounded-full font-mono text-11',
            isSelected ? 'bg-ink text-surface-0' : 'bg-surface-3',
          )}
        >
          {node.index + 1}
        </span>
        <span
          className={cn('min-w-0 flex-1 truncate font-semibold', isTree ? 'text-14' : 'text-13')}
        >
          {name}
        </span>
        <span
          className={cn(
            'font-mono text-11 tabular-nums',
            node.step.startsAt === null ? 'text-ink-dim' : 'font-semibold text-ink',
          )}
        >
          {formatRoundClock(seconds)}
        </span>
      </span>
      <span
        className={cn(
          'w-full text-12 text-ink-dim leading-dense',
          isTree ? 'line-clamp-3' : 'line-clamp-2',
        )}
      >
        {idea}
      </span>
      {isTree && <AliveDots node={node} />}
    </button>
  );
}

export function PlanGraphView({
  graph,
  metrics,
  variant,
  schedules,
  selected,
  zoom = 1,
  onSelect,
  onLane,
  onMenu,
  onBranch,
  onAddStep,
}: PlanGraphViewProps) {
  const t = useT();
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const size = graphSize(metrics, graph);
  const isTree = variant === 'tree';
  const selectedKey = selected === null ? null : nodeKey(selected.planId, selected.index);
  const tabStop = graph.nodes.find((node) => node.key === selectedKey) ?? graph.nodes[0];
  const titles = {
    root: t('library.tactics.board.branch.root'),
    branch: t('library.tactics.board.branch.unnamed'),
  };

  const register = (key: string, element: HTMLButtonElement | null) => {
    if (element === null) cards.current.delete(key);
    else cards.current.set(key, element);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, node: GraphNode) => {
    const direction = ARROWS[event.key];
    if (direction === undefined) return;
    event.preventDefault();
    const target = moveInGraph(graph, node, direction);
    if (target === null) return;
    cards.current.get(nodeKey(target.planId, target.index))?.focus();
    if (isTree) onSelect(target);
  };

  return (
    <div
      style={{ width: Math.round(size.width * zoom), height: Math.round(size.height * zoom) }}
      className="relative"
    >
      <div
        style={{
          width: size.width,
          height: size.height,
          transform: zoom === 1 ? undefined : `scale(${zoom})`,
        }}
        className="absolute top-0 left-0 origin-top-left"
      >
        <GraphEdges graph={graph} metrics={metrics} isTree={isTree} />
        {graph.lanes.map((lane) => (
          <LaneRow
            key={lane.planId}
            lane={lane}
            metrics={metrics}
            titles={titles}
            onLane={onLane}
            onAddStep={onAddStep}
          />
        ))}
        {graph.nodes.map((node) => {
          const origin = nodeOrigin(metrics, node.row, node.col);
          const plan = graph.lanes.find((lane) => lane.planId === node.planId)?.plan;
          return (
            <div key={node.key}>
              <GraphCard
                node={node}
                metrics={metrics}
                isTree={isTree}
                isSelected={node.key === selectedKey}
                isTabStop={node === tabStop}
                seconds={schedules.get(node.planId)?.steps[node.index]?.startSeconds ?? 0}
                planName={plan === undefined ? '' : planTitle(plan, titles)}
                register={register}
                onSelect={onSelect}
                onKeyDown={handleKeyDown}
                onMenu={onMenu}
              />
              {onBranch !== undefined && (
                <button
                  type="button"
                  onClick={() => onBranch(node)}
                  aria-label={t('library.tactics.board.strip.branchAfter', {
                    index: node.index + 1,
                  })}
                  title={t('library.tactics.board.strip.branchAfter', { index: node.index + 1 })}
                  style={{
                    left: origin.x + metrics.nodeWidth / 2 - 10,
                    top: origin.y + metrics.nodeHeight + (metrics.rowGap - 20) / 2,
                  }}
                  className="absolute grid size-5 place-items-center rounded-full border border-line-strong bg-surface-0 text-ink-dim transition-colors hover:bg-hover hover:text-ink"
                >
                  <Plus aria-hidden="true" className="size-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
