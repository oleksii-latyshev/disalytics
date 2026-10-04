import { Text } from '@disa/i18n';
import { Plus } from 'lucide-react';
import { PickDemoButton } from './PickDemoButton';
import type { WidgetProps } from './types';

/** A dashed drop zone inside the tile: the whole page takes a drop, and this is where to press. */
export function OpenWidget({ actions }: WidgetProps) {
  return (
    <PickDemoButton
      onFile={actions.onFile}
      className="absolute inset-3.5 flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong p-2 text-center transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:inset-x-5 md:inset-y-[18px]"
    >
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full border border-line-strong"
      >
        <Plus className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="text-16 font-semibold leading-dense">
        <Text path="library.home.widget.open.action" />
      </span>
      <span className="font-mono text-11 text-ink-faint leading-prose">
        <Text path="library.home.widget.open.hint" />
      </span>
    </PickDemoButton>
  );
}
