import type { TranslationKey } from '@disa/i18n';
import { type ReviewAction, reviewActionOf, type Totals } from '../../helpers/summary';
import { BarButton, BottomBar } from './BottomBar';
import type { StepNumber } from './Stepper';

interface Props {
  step: StepNumber;
  totals: Totals;
  ready: boolean;
  questionCount: number;
  /** The file has collections for this map, which a save with no lineup changes still reaches. */
  hasCollections: boolean;
  /** The question on screen cannot be left yet: something in it still needs fixing. */
  blocked: boolean;
  isLastQuestion: boolean;
  onStart: () => void;
  onNext: () => void;
  onBack: () => void;
  onSave: () => void;
}

const REVIEW_LABEL: Readonly<Record<ReviewAction, TranslationKey>> = {
  fix: 'admin.bar.fixFirst',
  apply: 'admin.bar.apply',
  collections: 'admin.bar.toCollections',
  nothing: 'admin.bar.nothing',
};

function ReviewButtons({ totals, questionCount, hasCollections, onBack, onSave }: Props) {
  const action = reviewActionOf(totals, hasCollections);
  return (
    <>
      <BarButton
        label={questionCount > 0 ? 'admin.bar.backToQuestions' : 'admin.bar.backToFile'}
        onClick={onBack}
      />
      <BarButton
        primary
        disabled={action === 'fix' || action === 'nothing'}
        label={REVIEW_LABEL[action]}
        values={{ count: totals.blocked }}
        onClick={onSave}
      />
    </>
  );
}

function QuestionButtons({ blocked, isLastQuestion, onBack, onNext }: Props) {
  return (
    <>
      <BarButton label="admin.bar.back" onClick={onBack} />
      <BarButton
        primary
        disabled={blocked}
        label={isLastQuestion ? 'admin.bar.toReview' : 'admin.bar.next'}
        onClick={onNext}
      />
    </>
  );
}

function FileButtons({ ready, questionCount, onStart }: Props) {
  return (
    <BarButton
      primary
      disabled={!ready}
      label={questionCount > 0 ? 'admin.bar.start' : 'admin.bar.toReview'}
      values={{ count: questionCount }}
      onClick={onStart}
    />
  );
}

/** The one button each step has, next to the counts. */
export function FlowBar(props: Props) {
  const { step } = props;
  return (
    <BottomBar totals={step === 4 || !props.ready ? null : props.totals}>
      {step === 1 ? <FileButtons {...props} /> : null}
      {step === 2 ? <QuestionButtons {...props} /> : null}
      {step === 3 ? <ReviewButtons {...props} /> : null}
    </BottomBar>
  );
}
