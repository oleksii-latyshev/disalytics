import { Text, useT } from '@disa/i18n';
import { Plus } from 'lucide-react';
import { useRef } from 'react';
import { ACCEPTED_EXTENSIONS, takeChosenFile } from '../helpers/demo-file';

interface Props {
  onFile: (file: File) => void;
}

/** The grid's last card: a way to add a match, in the same place the matches are. */
export function OpenDemoCard({ onFile }: Props) {
  const t = useT();
  const picker = useRef<HTMLInputElement>(null);

  return (
    <li className="list-none">
      <button
        type="button"
        aria-label={t('library.grid.openTitle')}
        onClick={() => picker.current?.click()}
        className="flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong px-4 py-6 text-center transition-colors duration-(--duration-micro) ease-out hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
      >
        <span className="grid size-10 place-items-center rounded-full border border-line-strong">
          <Plus aria-hidden="true" className="size-4" />
        </span>
        <span className="text-14 font-medium">
          <Text path="library.grid.openTitle" />
        </span>
        <span className="numeric text-12 text-ink-dim">
          <Text path="library.grid.openFormats" />
        </span>
      </button>
      <input
        ref={picker}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(event) => {
          const chosen = takeChosenFile(event.target);
          if (chosen) onFile(chosen);
        }}
      />
    </li>
  );
}
