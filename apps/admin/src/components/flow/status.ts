import type { TranslationKey } from '@disa/i18n';
import type { Outcome } from '../../helpers/review';

export type Tone = 'new' | 'update' | 'duplicate' | 'invalid' | 'same';

export function toneColor(tone: Tone): string {
  return `var(--status-${tone})`;
}

export const OUTCOME_TONE: Readonly<Record<Outcome, Tone>> = {
  add: 'new',
  addSecond: 'new',
  update: 'update',
  merge: 'update',
  skip: 'same',
  same: 'same',
  fix: 'invalid',
};

export const OUTCOME_KEY: Readonly<Record<Outcome, TranslationKey>> = {
  add: 'admin.outcome.add',
  addSecond: 'admin.outcome.addSecond',
  update: 'admin.outcome.update',
  merge: 'admin.outcome.merge',
  skip: 'admin.outcome.skip',
  same: 'admin.outcome.same',
  fix: 'admin.outcome.fix',
};
