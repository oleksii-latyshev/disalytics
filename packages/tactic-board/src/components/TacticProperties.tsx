import type { ReactNode } from 'react';

export interface TacticPropertiesProps {
  /** Above the step: where a branch says what it leaves from. */
  readonly beforeStep?: ReactNode;
  readonly step: ReactNode;
  /** Under the step's own fields: branch actions of the step. */
  readonly afterStep?: ReactNode;
  readonly player: ReactNode;
  /** Under the picked player: what else a step can say about the other side. */
  readonly afterPlayer?: ReactNode;
  readonly throws: ReactNode;
  readonly label: string;
}

/** The right column: the step, the picked player and the step's grenades, with room for what follows. */
export function TacticProperties({
  beforeStep,
  step,
  afterStep,
  player,
  afterPlayer,
  throws,
  label,
}: TacticPropertiesProps) {
  return (
    <aside aria-label={label} className="flex min-h-0 flex-col overflow-y-auto">
      {beforeStep}
      {step}
      {afterStep}
      {player}
      {afterPlayer}
      {throws}
    </aside>
  );
}
