import { Text } from '@disa/i18n';
import { EconomyCalculator } from './EconomyCalculator';

export function ToolsView() {
  return (
    <div className="mx-auto flex w-full max-w-[64rem] flex-col gap-6 py-4">
      <header className="flex flex-col gap-1">
        <h2 className="font-ui font-medium text-28 text-ink leading-dense">
          <Text path="library.tools.title" />
        </h2>
        <p className="text-14 text-ink-dim leading-prose">
          <Text path="library.tools.note" />
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <header className="flex flex-col gap-0.5">
          <h3 className="font-ui font-medium text-20 text-ink leading-dense">
            <Text path="library.tools.economy.title" />
          </h3>
          <p className="text-12 text-ink-dim leading-prose">
            <Text path="library.tools.economy.note" />
          </p>
        </header>

        <EconomyCalculator />
      </section>
    </div>
  );
}
