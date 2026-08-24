import { Text, type TranslationKey } from '@disa/i18n';
import type { ReactNode } from 'react';

interface Props {
  labelPath: TranslationKey;
  notePath: TranslationKey;
  control: ReactNode;
}

/**
 * One setting: what it is, what choosing it costs, and the control. The note is not decoration —
 * every row in §10.5 that has a real cost says so, and the scoreboard's is the clearest case in the
 * product, since choosing the plate is what spends §2.3's one blur exception.
 */
export function SettingRow({ labelPath, notePath, control }: Props) {
  return (
    <div className="flex min-h-control-lg items-start justify-between gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-15">
          <Text path={labelPath} />
        </span>
        <span className="text-13 text-ink-dim leading-prose">
          <Text path={notePath} />
        </span>
      </div>

      {control}
    </div>
  );
}
