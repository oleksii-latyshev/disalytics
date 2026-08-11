import { type Frame, type ParsedDemo, roundIndexAtFrame, roundOpeningFrame } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import type { ChangeEvent } from 'react';
import type { Transport } from '@/core/playback';

/** The stretch before round 1 starts, which no round covers. */
const WARMUP = -1;

interface Props {
  demo: ParsedDemo;
  transport: Transport;
  frame: Frame;
}

export function RoundPicker({ demo, transport, frame }: Props) {
  const t = useT();
  const { rounds } = demo.events;

  if (rounds.length === 0) return null;

  const roundIndex = roundIndexAtFrame(demo, frame) ?? WARMUP;

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const index = Number(event.currentTarget.value);
    if (index === WARMUP) return;

    transport.seek(roundOpeningFrame(demo, index));
  }

  return (
    <label className="flex items-center gap-2">
      <span className="label-dense">
        <Text path="timeline.round" />
      </span>

      <select
        value={roundIndex}
        onChange={handleChange}
        className="numeric h-control rounded-card border border-line bg-surface-2 px-2 text-13"
      >
        {roundIndex === WARMUP && <option value={WARMUP}>{t('timeline.warmup')}</option>}

        {rounds.map((round, index) => (
          <option key={round.number} value={index}>
            {round.number}
          </option>
        ))}
      </select>
    </label>
  );
}
