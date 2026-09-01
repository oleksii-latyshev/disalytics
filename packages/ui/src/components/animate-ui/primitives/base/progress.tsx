'use client';

import * as React from 'react';
import { Progress as ProgressPrimitives } from '@base-ui-components/react/progress';
import { motion, type Transition } from 'motion/react';

import {
  CountingNumber,
  type CountingNumberProps,
} from '#components/animate-ui/primitives/texts/counting-number.tsx';
import { getStrictContext } from '#lib/get-strict-context.tsx';

type ProgressContextType = {
  value: number;
};

const [ProgressProvider, useProgress] =
  getStrictContext<ProgressContextType>('ProgressContext');

type ProgressProps = React.ComponentProps<typeof ProgressPrimitives.Root>;

const Progress = (props: ProgressProps) => {
  return (
    <ProgressProvider value={{ value: props.value ?? 0 }}>
      <ProgressPrimitives.Root data-slot="progress" {...props} />
    </ProgressProvider>
  );
};

// Deviation 2 of 2 — see `UPSTREAM.md`. Upstream derives this from `typeof
// MotionProgressIndicator`, which drags the inferred type of `motion.create(...)` into the emitted
// declarations; that type names a Base UI internal with no `exports` entry, so there is no specifier
// `tsc` can write for it (TS2742) and this package cannot publish its types at all. Naming the two
// halves directly says the same thing and keeps the local component out of the `.d.ts`. The `Omit`
// is the drag and animation handlers, whose React and motion signatures share names and differ in
// arguments — which is exactly why `motion.create` drops them from what it accepts.
type ProgressIndicatorProps = Omit<
  React.ComponentProps<typeof ProgressPrimitives.Indicator>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'style'
> & {
  transition?: Transition;
};

const MotionProgressIndicator = motion.create(ProgressPrimitives.Indicator);

function ProgressIndicator({
  transition = { type: 'spring', stiffness: 100, damping: 30 },
  ...props
}: ProgressIndicatorProps) {
  const { value } = useProgress();

  return (
    <MotionProgressIndicator
      data-slot="progress-indicator"
      animate={{ width: `${value}%` }}
      transition={transition}
      {...props}
    />
  );
}

type ProgressTrackProps = React.ComponentProps<typeof ProgressPrimitives.Track>;

function ProgressTrack(props: ProgressTrackProps) {
  return <ProgressPrimitives.Track data-slot="progress-track" {...props} />;
}

type ProgressLabelProps = React.ComponentProps<typeof ProgressPrimitives.Label>;

function ProgressLabel(props: ProgressLabelProps) {
  return <ProgressPrimitives.Label data-slot="progress-label" {...props} />;
}

type ProgressValueProps = Omit<
  React.ComponentProps<typeof ProgressPrimitives.Value>,
  'render'
> &
  Omit<CountingNumberProps, 'number'>;

function ProgressValue({
  transition = { stiffness: 80, damping: 20 },
  ...props
}: ProgressValueProps) {
  const { value } = useProgress();

  return (
    <ProgressPrimitives.Value
      data-slot="progress-value"
      render={
        <CountingNumber
          number={value ?? 0}
          transition={transition}
          {...props}
        />
      }
    />
  );
}

export {
  Progress,
  ProgressIndicator,
  ProgressTrack,
  ProgressLabel,
  ProgressValue,
  useProgress,
  type ProgressProps,
  type ProgressIndicatorProps,
  type ProgressTrackProps,
  type ProgressLabelProps,
  type ProgressValueProps,
  type ProgressContextType,
};
