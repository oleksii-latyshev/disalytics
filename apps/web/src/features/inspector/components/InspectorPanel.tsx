import { Text } from '@disa/i18n';
import type { CacheState } from '@/core/parsing';
import { cacheKey } from '../helpers/cache-copy';

interface Props {
  cache: CacheState;
}

export function InspectorPanel({ cache }: Props) {
  return (
    <section className="flex min-h-0 flex-col gap-3 overflow-y-auto border-line border-l bg-surface-1 p-4">
      <h2 className="label-dense">
        <Text path="inspector.title" />
      </h2>

      <p className="text-13 text-ink-dim leading-prose">
        <Text path="inspector.empty" />
      </p>

      <p className="mt-auto text-12 text-ink-faint leading-prose">
        <Text path={cacheKey(cache)} />
      </p>
    </section>
  );
}
