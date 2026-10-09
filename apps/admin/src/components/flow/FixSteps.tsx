import { MAX_TITLE_LENGTH, type Problem, type ProblemCode } from '@disa/admin-contract';
import type { Lineup } from '@disa/demo-core';
import { Text, type TranslationKey, useT } from '@disa/i18n';
import { Button, cn, Input } from '@disa/ui';
import { useId } from 'react';
import type { PointName } from '../map/MapMarks';

export const PROBLEM_TEXT: Readonly<
  Record<ProblemCode, { what: TranslationKey; how: TranslationKey }>
> = {
  title_blank: { what: 'admin.fix.titleBlank', how: 'admin.fix.titleBlankHow' },
  title_too_long: { what: 'admin.fix.titleLong', how: 'admin.fix.titleLongHow' },
  origin_off_map: { what: 'admin.fix.originOff', how: 'admin.fix.originOffHow' },
  landing_off_map: { what: 'admin.fix.landingOff', how: 'admin.fix.landingOffHow' },
  photo_not_https: { what: 'admin.fix.photoHttp', how: 'admin.fix.photoHttpHow' },
  wrong_map: { what: 'admin.fix.wrongMap', how: 'admin.fix.wrongMapHow' },
  invalid_lineup: { what: 'admin.fix.invalid', how: 'admin.fix.invalidHow' },
};

interface Props {
  /** What was wrong when the lineup was opened; a step stays on screen, as fixed, once it is fixed. */
  initial: readonly Problem[];
  /** What is wrong with the lineup as it would be saved now. */
  problems: readonly Problem[];
  /** The lineup as it would be saved. */
  lineup: Lineup;
  placing: PointName | null;
  onPlacing: (name: PointName | null) => void;
  onTitle: (title: string) => void;
  onDropPhoto: (ref: string) => void;
}

function Control({ code, ...props }: Props & { code: ProblemCode }) {
  const t = useT();
  const id = useId();
  const broken = props.problems.some((problem) => problem.code === code);
  switch (code) {
    case 'title_blank':
    case 'title_too_long':
      return (
        <label htmlFor={id} className="mt-2 flex flex-col gap-1 text-13 text-ink-dim">
          <Text path="admin.fix.titleLabel" />
          <Input
            id={id}
            value={props.lineup.title}
            maxLength={MAX_TITLE_LENGTH * 2}
            placeholder={t('admin.fix.titlePlaceholder')}
            onChange={(event) => props.onTitle(event.currentTarget.value)}
          />
        </label>
      );
    case 'origin_off_map':
    case 'landing_off_map': {
      if (!broken) return null;
      const name = code === 'origin_off_map' ? 'origin' : 'landing';
      return (
        <Button
          variant="outline"
          className="mt-2"
          aria-pressed={props.placing === name}
          onClick={() => props.onPlacing(props.placing === name ? null : name)}
        >
          <Text path={props.placing === name ? 'admin.fix.waiting' : 'admin.fix.place'} />
        </Button>
      );
    }
    case 'photo_not_https':
      return (
        <div className="mt-2 flex flex-wrap gap-2">
          {props.problems.map((problem) => {
            const ref =
              problem.code === code ? props.lineup.imageUrls?.[problem.index ?? -1] : undefined;
            return ref === undefined ? null : (
              <Button key={ref} variant="outline" onClick={() => props.onDropPhoto(ref)}>
                <Text path="admin.fix.dropPhoto" />
              </Button>
            );
          })}
        </div>
      );
    case 'wrong_map':
    case 'invalid_lineup':
      return null;
  }
}

function stepsOf(initial: readonly Problem[], current: readonly Problem[]): ProblemCode[] {
  return [...new Set([...initial, ...current].map(({ code }) => code))];
}

/** What is wrong with a lineup, one step at a time, each with the thing that fixes it. */
export function FixSteps(props: Props) {
  const { problems } = props;
  const steps = stepsOf(props.initial, problems);
  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {steps.map((code) => {
        const fixed = !problems.some((problem) => problem.code === code);
        return (
          <div
            key={code}
            className={cn(
              'grid grid-cols-[26px_minmax(0,1fr)] gap-2.5 rounded-chip border p-3 transition-[border-color,background-color] duration-(--duration-base)',
              fixed
                ? 'border-[color-mix(in_srgb,var(--status-new)_40%,transparent)] bg-[color-mix(in_srgb,var(--status-new)_7%,transparent)]'
                : 'border-[color-mix(in_srgb,var(--status-invalid)_40%,transparent)] bg-[color-mix(in_srgb,var(--status-invalid)_7%,transparent)]',
            )}
          >
            <span aria-hidden="true" className="font-semibold text-ink">
              {fixed ? '✓' : '!'}
            </span>
            <div>
              <b className="font-semibold text-14 text-ink">
                <Text path={fixed ? 'admin.fix.fixed' : PROBLEM_TEXT[code].what} />
              </b>
              {fixed ? null : (
                <p className="text-13 text-ink-dim">
                  <Text path={PROBLEM_TEXT[code].how} />
                </p>
              )}
              <Control code={code} {...props} />
            </div>
          </div>
        );
      })}
      {steps.length > 0 && problems.length === 0 ? (
        <p role="status" className="text-13 text-[var(--status-new)]">
          <Text path="admin.fix.allGood" />
        </p>
      ) : null}
    </div>
  );
}
