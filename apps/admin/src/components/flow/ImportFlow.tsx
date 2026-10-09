import type { Lineup } from '@disa/demo-core';
import { AnimatePresence, DURATION_PANEL_SECONDS, EASE_OUT, motion } from '@disa/ui';
import { useState } from 'react';
import { totalsOf, writingsOf } from '../../helpers/summary';
import { useApply } from '../../hooks/use-apply';
import { useReview } from '../../hooks/use-review';
import { FlowBar } from './FlowBar';
import { StepDecide } from './StepDecide';
import { StepDone } from './StepDone';
import { StepFile } from './StepFile';
import { type StepNumber, Stepper } from './Stepper';
import { StepReview } from './StepReview';

interface Props {
  map: string;
  onMap: (map: string) => void;
  /** The map's lineups on the site, as they are now. */
  onSite: readonly Lineup[];
  /** Something on the site changed: the lists that show it reload. */
  onChanged: () => void;
}

function useSteps() {
  const [step, setStep] = useState<StepNumber>(1);
  const [question, setQuestion] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const go = (next: StepNumber, by: 1 | -1) => {
    setDirection(by);
    setStep(next);
  };
  return {
    step,
    question,
    direction,
    go,
    start: (questionCount: number) => {
      setQuestion(0);
      go(questionCount > 0 ? 2 : 3, 1);
    },
    next: (questionCount: number) => {
      if (step === 2 && question + 1 < questionCount) {
        setDirection(1);
        setQuestion(question + 1);
      } else go(3, 1);
    },
    back: (questionCount: number) => {
      if (step === 2 && question > 0) {
        setDirection(-1);
        setQuestion(question - 1);
      } else if (step === 3 && questionCount > 0) {
        setQuestion(questionCount - 1);
        go(2, -1);
      } else go(1, -1);
    },
    restart: () => {
      setQuestion(0);
      go(1, -1);
    },
  };
}

/**
 * The guided flow: pick the file, answer the few questions that need a person, look over
 * everything, save. The bottom bar holds the counts and the one button for the step.
 */
export function ImportFlow({ map, onMap, onSite, onChanged }: Props) {
  const apply = useApply(onChanged);
  const steps = useSteps();
  const { step, question, direction } = steps;
  const review = useReview(map, onMap, () => {
    apply.reset();
    steps.restart();
  });

  const { rows, questions } = review;
  const replaced = new Set(
    rows.flatMap((row) => (row.plan.kind === 'replace' ? [row.plan.targetId] : [])),
  );
  const removals = [...review.state.removals].filter((id) => !replaced.has(id));
  const current = questions[question];

  const save = () => {
    apply.start({
      map,
      writings: writingsOf(rows),
      images: review.images,
      photoBase: review.state.photoBase,
      removals,
      skipped: rows.filter((row) => row.plan.kind === 'skip').length,
    });
    steps.go(4, 1);
  };
  const again = () => {
    apply.reset();
    review.clear();
    steps.restart();
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <Stepper step={step} />
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: 32 * direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 * direction }}
          transition={{ duration: DURATION_PANEL_SECONDS, ease: EASE_OUT }}
        >
          {step === 1 ? <StepFile map={map} onMap={onMap} review={review} /> : null}
          {step === 2 ? (
            <StepDecide
              map={map}
              review={review}
              onSite={onSite}
              index={question}
              direction={direction}
            />
          ) : null}
          {step === 3 ? <StepReview map={map} review={review} onSite={onSite} /> : null}
          {step === 4 ? (
            <StepDone
              state={apply.state}
              onRetry={() => void apply.retry()}
              onRetryPhotos={apply.retryPhotos}
              onWithoutPhotos={apply.continueWithout}
              onAgain={again}
              onBackToCheck={() => {
                apply.reset();
                steps.go(3, -1);
              }}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>
      <FlowBar
        step={step}
        totals={totalsOf(rows, removals.length)}
        ready={review.data !== null && rows.length > 0}
        questionCount={questions.length}
        blocked={current !== undefined && (current.problems.length > 0 || current.clash.length > 0)}
        isLastQuestion={question + 1 >= questions.length}
        onStart={() => steps.start(questions.length)}
        onNext={() => steps.next(questions.length)}
        onBack={() => steps.back(questions.length)}
        onSave={save}
      />
    </div>
  );
}
