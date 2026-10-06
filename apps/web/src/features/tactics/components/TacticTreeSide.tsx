import { childPlans, type Tactic, type UtilityKind } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import { Button, cn } from '@disa/ui';
import { useState } from 'react';
import { slotVar } from '../helpers/tactic-colors';
import type { GraphNode, PlanGraph } from '../helpers/tactic-plan-graph';
import { planTitle } from '../helpers/tactic-plan-labels';
import { formatRoundClock, type TacticSchedule } from '../helpers/tactic-schedule';

export interface TacticTreeSideProps {
  readonly tactic: Tactic;
  readonly graph: PlanGraph;
  readonly node: GraphNode;
  readonly schedule: TacticSchedule | undefined;
  readonly stepDeleteBlock: string | null;
  readonly onOpen: () => void;
  readonly onDeleteStep: () => void;
  readonly onDeleteBranch: () => void;
}

const KIND_NAMES: Partial<Record<UtilityKind, 'smoke' | 'flash' | 'fire' | 'he'>> = {
  smoke: 'smoke',
  flash: 'flash',
  fire: 'fire',
  he: 'he',
};

const SECTION = 'font-mono text-11 uppercase tracking-[0.12em] text-ink-faint';

type Pending = 'step' | 'branch' | null;

export function TacticTreeSide({
  tactic,
  graph,
  node,
  schedule,
  stepDeleteBlock,
  onOpen,
  onDeleteStep,
  onDeleteBranch,
}: TacticTreeSideProps) {
  const t = useT();
  const lane = graph.lanes.find((entry) => entry.planId === node.planId);
  const titles = {
    root: t('library.tactics.board.branch.root'),
    branch: t('library.tactics.board.branch.unnamed'),
  };
  const planName = lane === undefined ? '' : planTitle(lane.plan, titles);
  const clock = formatRoundClock(schedule?.steps[node.index]?.startSeconds ?? 0);
  const name =
    node.step.name.trim() || t('library.tactics.board.strip.unnamed', { index: node.index + 1 });
  const isRoot = lane?.isRoot ?? true;
  const sharesWithBranches = childPlans(tactic, node.planId).some(
    (child) => child.forkAfter > node.index,
  );
  const branchBlock = isRoot ? t('library.tactics.board.tree.rootDeleteNote') : null;
  const note =
    stepDeleteBlock ??
    (isRoot
      ? t('library.tactics.board.tree.rootDeleteNote')
      : sharesWithBranches
        ? t('library.tactics.board.tree.sharedDelete')
        : t('library.tactics.board.tree.branchDeleteNote'));

  return (
    <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto p-4 [border-inline-start:1px_solid_var(--color-line)]">
      <span className="font-mono text-11 text-ink-dim uppercase tracking-[0.1em]">
        {isRoot
          ? t('library.tactics.board.tree.eyebrowRoot', { index: node.index + 1, clock })
          : t('library.tactics.board.tree.eyebrowBranch', {
              name: planName,
              index: node.index + 1,
              clock,
            })}
      </span>
      <h3 className="font-semibold text-20 leading-dense">{name}</h3>
      <p className="text-13 text-ink-dim leading-prose">
        {node.step.idea?.trim() || t('library.tactics.board.strip.noIdea')}
      </p>

      <TasksSection node={node} />
      <UtilitySection node={node} />

      <div className="mt-auto flex flex-col gap-2">
        <Button onClick={onOpen}>{t('library.tactics.board.tree.openStep')}</Button>
        <DeleteControls
          index={node.index}
          planName={planName}
          stepDeleteBlock={stepDeleteBlock}
          branchBlock={branchBlock}
          onDeleteStep={onDeleteStep}
          onDeleteBranch={onDeleteBranch}
        />
        <p className="text-11 text-ink-faint leading-prose">{note}</p>
      </div>
    </aside>
  );
}

function TasksSection({ node }: { readonly node: GraphNode }) {
  const t = useT();
  return (
    <section className="flex flex-col gap-1.5 rounded-card bg-surface-1 p-3">
      <h4 className={SECTION}>{t('library.tactics.board.tree.tasks')}</h4>
      {node.alive.map((isAlive, slot) => {
        const task = node.step.players.find((player) => player.slot === slot)?.task?.trim();
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: slots are positions
          <div key={slot} className="flex items-start gap-2 text-12 leading-dense">
            <span
              className={cn(
                'grid size-4.5 shrink-0 place-items-center rounded-full font-mono font-semibold text-11',
                isAlive ? 'text-surface-0' : 'bg-surface-3 text-ink-faint',
              )}
              style={isAlive ? { background: slotVar(slot) } : undefined}
            >
              {slot + 1}
            </span>
            <span className={isAlive ? 'text-ink' : 'text-ink-faint line-through'}>
              {isAlive
                ? task || t('library.tactics.board.tree.taskNone')
                : t('library.tactics.board.tree.taskOut')}
            </span>
          </div>
        );
      })}
    </section>
  );
}

function UtilitySection({ node }: { readonly node: GraphNode }) {
  const t = useT();
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className={SECTION}>{t('library.tactics.board.tree.utility')}</h4>
      {node.step.throws.length === 0 ? (
        <p className="text-12 text-ink-dim">{t('library.tactics.board.tree.noUtility')}</p>
      ) : (
        node.step.throws.map((thrown) => {
          const kind = KIND_NAMES[thrown.kind];
          return (
            <p key={thrown.id} className="text-12 text-ink-dim leading-dense">
              {t('library.tactics.board.tree.utilityRow', {
                kind:
                  kind === undefined ? thrown.kind : t(`library.tactics.board.tools.kinds.${kind}`),
                slot: thrown.throwerSlot + 1,
              })}
            </p>
          );
        })
      )}
    </section>
  );
}

interface DeleteControlsProps {
  readonly index: number;
  readonly planName: string;
  readonly stepDeleteBlock: string | null;
  readonly branchBlock: string | null;
  readonly onDeleteStep: () => void;
  readonly onDeleteBranch: () => void;
}

function DeleteControls({
  index,
  planName,
  stepDeleteBlock,
  branchBlock,
  onDeleteStep,
  onDeleteBranch,
}: DeleteControlsProps) {
  const t = useT();
  const [pending, setPending] = useState<Pending>(null);
  const confirm = (action: () => void) => {
    setPending(null);
    action();
  };
  return (
    <>
      {pending === null ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={stepDeleteBlock !== null}
            title={stepDeleteBlock ?? undefined}
            onClick={() => setPending('step')}
            className="text-damage"
          >
            {t('library.tactics.board.tree.deleteStep')}
          </Button>
          <Button
            variant="outline"
            disabled={branchBlock !== null}
            title={branchBlock ?? undefined}
            onClick={() => setPending('branch')}
            className="text-damage"
          >
            {t('library.tactics.board.tree.deleteBranch')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-card border border-line p-2.5">
          <span className="text-13">
            {pending === 'step'
              ? t('library.tactics.board.tree.confirmStep', { index: index + 1 })
              : t('library.tactics.board.tree.confirmBranch', { name: planName })}
          </span>
          <span className="text-11 text-ink-faint">{t('library.tactics.board.tree.undoNote')}</span>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>
              {t('library.tactics.board.tree.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirm(pending === 'step' ? onDeleteStep : onDeleteBranch)}
            >
              {t('library.tactics.board.tree.confirm')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
