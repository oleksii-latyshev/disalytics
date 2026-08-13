import type { TranslationKey } from '@disa/i18n';
import { Text } from '@disa/i18n';
import type { OpenFailure } from '@/core/parsing';
import { errorHintKey, errorTitleKey } from '../helpers/error-copy';
import { DemoFileName } from './DemoFileName';

interface Props {
  failure: OpenFailure;
  fileName: string;
}

function copyFor(failure: OpenFailure): { title: TranslationKey; hint: TranslationKey } {
  if (failure.kind === 'cacheGone') {
    return { title: 'library.saved.gone.title', hint: 'library.saved.gone.hint' };
  }

  return { title: errorTitleKey(failure.code), hint: errorHintKey(failure.code) };
}

export function ParseFailure({ failure, fileName }: Props) {
  const copy = copyFor(failure);

  return (
    <section
      role="alert"
      className="flex flex-col gap-2 rounded-card border border-damage/50 bg-surface-2 p-4"
    >
      <h2 className="font-ui text-16 leading-dense">
        <Text path={copy.title} />
      </h2>
      <p className="max-w-[52ch] text-13 text-ink-dim leading-prose">
        <Text path={copy.hint} />
      </p>
      <DemoFileName fileName={fileName} />
    </section>
  );
}
