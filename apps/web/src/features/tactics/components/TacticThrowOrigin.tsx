import { useT } from '@disa/i18n';
import { useId } from 'react';
import type { ThrowOrigin } from '../helpers/tactic-throw-origins';

export interface TacticThrowOriginProps {
  readonly origins: readonly ThrowOrigin[];
  readonly chosen: number;
  readonly onFrom: (origin: ThrowOrigin) => void;
}

/** Which spot of the thrower's route a hand throw leaves from; the player walks on after it. */
export function TacticThrowOrigin({ origins, chosen, onFrom }: TacticThrowOriginProps) {
  const t = useT();
  const id = useId();
  if (origins.length < 2) return null;

  const labelOf = (origin: ThrowOrigin) => {
    switch (origin.kind) {
      case 'start':
        return t('library.tactics.board.throws.fromStart');
      case 'point':
        return t('library.tactics.board.throws.fromPoint', { number: origin.number });
      case 'end':
        return t('library.tactics.board.throws.fromEnd');
    }
  };

  return (
    <label htmlFor={id} className="flex items-center gap-2 text-11 text-ink-dim">
      <span className="shrink-0">{t('library.tactics.board.throws.from')}</span>
      <select
        id={id}
        value={chosen}
        onChange={(event) => {
          const origin = origins[Number(event.target.value)];
          if (origin !== undefined) onFrom(origin);
        }}
        className="h-7 min-w-0 flex-1 rounded-chip border border-line bg-surface-0 px-2 text-12 text-ink focus-visible:border-line-strong"
      >
        {origins.map((origin, i) => (
          <option key={`${origin.kind}-${origin.at.x},${origin.at.y}`} value={i}>
            {labelOf(origin)}
          </option>
        ))}
      </select>
    </label>
  );
}
