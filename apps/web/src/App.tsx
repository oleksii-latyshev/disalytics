import { Text } from '@disa/i18n';
import { DemoLibrary } from '@/features/library';

export function App() {
  return (
    <div className="app-shell grid place-items-center p-8">
      <main className="flex w-full max-w-[64ch] flex-col gap-6">
        <header className="flex flex-col gap-3">
          <h1 className="font-ui text-28 leading-dense">disalytics</h1>
          <p className="text-16 leading-prose">
            <Text path="common.tagline" />
          </p>
        </header>

        <DemoLibrary />

        <p className="text-13 text-ink-dim leading-prose">
          <Text path="common.privacyNote" />
        </p>
      </main>
    </div>
  );
}
