import type { TranslationKey } from '@disa/i18n';
import { Text } from '@disa/i18n';
import type { OpenFailure } from '@/core/parsing';
import { errorHintKey, errorTitleKey } from '../helpers/error-copy';
import { ChooseDemo } from './ChooseDemo';
import { DemoFileName } from './DemoFileName';

interface Props {
  failure: OpenFailure;
  fileName: string;
  onFile: (file: File) => void;
}

function copyFor(failure: OpenFailure): { title: TranslationKey; hint: TranslationKey } {
  if (failure.kind === 'cacheGone') {
    return { title: 'library.saved.gone.title', hint: 'library.saved.gone.hint' };
  }

  return { title: errorTitleKey(failure.code), hint: errorHintKey(failure.code) };
}

/**
 * The failure. **The same card in the same place**, so it is the card's whole content rather than a
 * box stacked above the way in: what happened, what to do, and the route to doing it.
 *
 * It carries no `--damage`. The token layer leaves that colour exactly one reader — the damage flash
 * on a player token — and a tinted border here would be it standing in for *something bad
 * happened*, which is the use the palette rules out. The copy is what says an open failed, in the
 * interface's voice and without apologising.
 */
export function ParseFailure({ failure, fileName, onFile }: Props) {
  const copy = copyFor(failure);

  return (
    <section role="alert" className="flex flex-col items-start gap-4">
      <h2 className="font-ui font-medium text-20 leading-dense">
        <Text path={copy.title} />
      </h2>

      <p className="max-w-[52ch] text-13 text-ink-dim leading-prose">
        <Text path={copy.hint} />
      </p>

      <DemoFileName fileName={fileName} />

      <ChooseDemo onFile={onFile} />
    </section>
  );
}
