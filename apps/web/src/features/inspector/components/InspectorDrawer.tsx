import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import type { CacheState } from '@/core/parsing';
import { cacheKey } from '../helpers/cache-copy';

interface Props {
  cache: CacheState;
  fileName: string;
  onClose: () => void;
}

/**
 * The inspector is a drawer rather than a column — DESIGN.md §5. An empty column is dead weight on
 * every screen where nobody has been selected yet; a drawer costs nothing until it is asked for.
 *
 * It floats over the right rail, so it is glass, and **every ink level in here is `--ink`**: §2
 * measured `--ink-dim` on glass over the plate at 2.82:1 and ruled it out. What is secondary here
 * is secondary by size and weight instead.
 */
export function InspectorDrawer({ cache, fileName, onClose }: Props) {
  const t = useT();

  return (
    <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-float border border-line bg-glass-panel p-4 shadow-raised">
      <div className="flex items-center gap-3">
        <h2 className="label-dense text-ink">
          <Text path="inspector.title" />
        </h2>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ms-auto"
          aria-label={t('inspector.close')}
          onClick={onClose}
        >
          <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
            <path
              d="M2 2 L8 8 M8 2 L2 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </Button>
      </div>

      <p className="text-13 leading-prose">
        <Text path="inspector.empty" />
      </p>

      <div className="mt-auto flex flex-col gap-1">
        <span className="label-dense text-ink">
          <Text path="inspector.file" />
        </span>

        <p className="numeric break-all text-12 leading-prose">{fileName}</p>

        <p className="text-12 leading-prose">
          <Text path={cacheKey(cache)} />
        </p>
      </div>
    </aside>
  );
}
