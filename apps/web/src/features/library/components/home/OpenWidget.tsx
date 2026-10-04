import { Text } from '@disa/i18n';
import { FolderOpen } from 'lucide-react';
import { PickDemoButton } from './PickDemoButton';
import type { WidgetProps } from './types';

export function OpenWidget({ actions }: WidgetProps) {
  return (
    <PickDemoButton
      onFile={actions.onFile}
      className="absolute inset-0 flex flex-col items-start justify-center gap-1.5 p-4 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus md:px-5"
    >
      <span
        aria-hidden="true"
        className="mb-1 flex size-9 items-center justify-center rounded-chip border border-line-strong bg-ink text-surface-0"
      >
        <FolderOpen className="size-[18px]" strokeWidth={1.8} />
      </span>
      <span className="text-14 font-semibold leading-dense md:text-16">
        <Text path="library.home.widget.open.action" />
      </span>
      <span className="text-12 text-ink-dim leading-prose">
        <Text path="library.home.widget.open.hint" />
      </span>
    </PickDemoButton>
  );
}
