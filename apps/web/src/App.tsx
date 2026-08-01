import { Text } from '@disa/i18n';

export function App() {
  return (
    <div className="app-shell grid place-items-center p-8">
      <main className="flex max-w-[52ch] flex-col gap-3">
        <h1 className="font-ui text-28 leading-dense">disalytics</h1>
        <p className="text-16 leading-prose">
          <Text path="common.tagline" />
        </p>
        <p className="text-13 text-ink-dim leading-prose">
          <Text path="common.privacyNote" />
        </p>
      </main>
    </div>
  );
}
