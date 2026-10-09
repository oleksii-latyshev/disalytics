import type { Lineup, WorldPoint } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { AnimatePresence, DURATION_PANEL_SECONDS, EASE_OUT, motion } from '@disa/ui';
import { useState } from 'react';
import { copyFields } from '../../helpers/fields';
import type { Review } from '../../hooks/use-review';
import type { PointName } from '../map/MapMarks';
import { MapCard } from './MapCard';
import { Card } from './Parts';
import { Question } from './Question';
import { OUTCOME_TONE } from './status';

/**
 * One question at a time. The map beside it shows both versions, and a point can be dragged or
 * placed on it to fix it.
 */
export function StepDecide({
  map,
  review,
  onSite,
  index,
  direction,
}: {
  map: string;
  review: Review;
  onSite: readonly Lineup[];
  index: number;
  direction: 1 | -1;
}) {
  const row = review.questions[index];
  const [placement, setPlacement] = useState<{ id: string; name: PointName } | null>(null);
  if (row === undefined) return null;
  const { item } = row;
  const placing = placement !== null && placement.id === item.id ? placement.name : null;
  const setPlacing = (name: PointName | null) =>
    setPlacement(name === null ? null : { id: item.id, name });
  const move = (name: PointName, point: WorldPoint) => {
    setPlacing(null);
    review.dispatch({
      type: 'edit',
      id: item.id,
      next: copyFields(item.edited, { ...item.edited, [name]: point }, [name]),
      fields: [name],
    });
  };
  const current = row.plan.kind === 'skip' ? item.edited : row.plan.lineup;
  const others = onSite.filter((lineup) => lineup.id !== item.stored?.id);

  return (
    <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] items-start gap-4 max-lg:grid-cols-1">
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={item.id}
          custom={direction}
          initial={{ opacity: 0, x: 24 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 * direction }}
          transition={{ duration: DURATION_PANEL_SECONDS, ease: EASE_OUT }}
        >
          <Card>
            <p className="text-12 text-ink-faint uppercase tracking-wider">
              <Text
                path="admin.q.count"
                values={{ number: index + 1, total: review.questions.length }}
              />
            </p>
            <Question row={row} review={review} placing={placing} onPlacing={setPlacing} />
          </Card>
        </motion.div>
      </AnimatePresence>
      <MapCard
        className="sticky top-3"
        map={map}
        stored={others}
        counterpart={item.stored}
        current={current}
        tone={OUTCOME_TONE[row.outcome]}
        invalid={row.problems.flatMap((problem) =>
          problem.code === 'origin_off_map'
            ? ['origin' as const]
            : problem.code === 'landing_off_map'
              ? ['landing' as const]
              : [],
        )}
        placing={placing}
        onMove={move}
      />
    </div>
  );
}
