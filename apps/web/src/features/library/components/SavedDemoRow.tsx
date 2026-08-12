import type { SavedDemo } from '@disa/demo-store';
import { Text, useT } from '@disa/i18n';
import { Button } from '@disa/ui';
import { megabytesOf } from '../helpers/saved-list';
import { DemoFileName } from './DemoFileName';

interface Props {
  demo: SavedDemo;
  onOpen: (demo: SavedDemo) => void;
  onRemove: (key: string) => void;
}

/** A separator between facts, not a word: it is drawn for the eye and hidden from the reader. */
function Dot() {
  return (
    <span aria-hidden="true" className="text-ink-faint">
      ·
    </span>
  );
}

export function SavedDemoRow({ demo, onOpen, onRemove }: Props) {
  const t = useT();

  return (
    <li className="flex items-stretch gap-2">
      <button
        type="button"
        onClick={() => onOpen(demo)}
        aria-label={t('library.saved.open', { map: demo.map })}
        className="flex min-w-0 flex-1 flex-col gap-1 rounded-card border border-line bg-surface-2 px-3 py-2 text-left transition-colors duration-(--duration-micro) ease-out hover:bg-hover"
      >
        <span className="flex items-baseline justify-between gap-3">
          {/* A map name is game vocabulary and stays as the demo wrote it — AGENTS.md §11. */}
          <span className="truncate text-14">{demo.map}</span>
          <span className="numeric shrink-0 text-14">
            <Text path="library.saved.score" values={{ ...demo.score }} />
          </span>
        </span>

        <span className="flex flex-wrap items-baseline gap-x-2 text-12 text-ink-dim">
          <span className="numeric">
            <Text path="library.saved.rounds" values={{ count: demo.roundCount }} />
          </span>
          <Dot />
          <span className="numeric">
            <Text path="library.saved.storedAt" values={{ when: new Date(demo.storedAt) }} />
          </span>
          <Dot />
          <span className="numeric">
            <Text path="library.saved.size" values={{ megabytes: megabytesOf(demo.byteLength) }} />
          </span>
        </span>

        <DemoFileName fileName={demo.fileName} />
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('library.saved.remove', { fileName: demo.fileName })}
        onClick={() => onRemove(demo.key)}
      >
        <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
          <path
            d="M2 2 L8 8 M8 2 L2 8"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      </Button>
    </li>
  );
}
