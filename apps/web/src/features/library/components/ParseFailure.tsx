import type { ErrorCode } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { errorHintKey, errorTitleKey } from '../helpers/error-copy';
import { DemoFileName } from './DemoFileName';

interface Props {
  code: ErrorCode;
  fileName: string;
}

export function ParseFailure({ code, fileName }: Props) {
  return (
    <section
      role="alert"
      className="flex flex-col gap-2 rounded-float border border-damage/50 bg-surface-1 p-6"
    >
      <h2 className="font-ui text-16 leading-dense">
        <Text path={errorTitleKey(code)} />
      </h2>
      <p className="max-w-[52ch] text-13 text-ink-dim leading-prose">
        <Text path={errorHintKey(code)} />
      </p>
      <DemoFileName fileName={fileName} />
    </section>
  );
}
