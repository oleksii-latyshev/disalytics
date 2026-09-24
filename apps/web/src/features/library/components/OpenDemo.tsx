import { Text, useT } from '@disa/i18n';
import { FolderOpen } from 'lucide-react';
import { useRef } from 'react';
import { ACCEPTED_EXTENSIONS, takeChosenFile } from '../helpers/demo-file';
import { DemoFolderHint } from './DemoFolderHint';

interface Props {
  onFile: (file: File) => void;
  isDraggedOver: boolean;
}

export function OpenDemo({ onFile, isDraggedOver }: Props) {
  const t = useT();
  const picker = useRef<HTMLInputElement>(null);

  return (
    <>
      <p className="pr-6 text-13 font-medium text-ink">
        <Text path="library.open.start" />
      </p>
      <DemoFolderHint />
      <button
        type="button"
        aria-label={t('library.open.action')}
        onClick={() => picker.current?.click()}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-card bg-ink px-3 py-3 text-13 font-medium text-surface-0 transition-colors hover:bg-ink-dim"
      >
        <FolderOpen aria-hidden="true" className="size-5 shrink-0" />
        <Text path={isDraggedOver ? 'library.open.release' : 'library.open.action'} />
      </button>
      <p className="text-center text-11 text-ink-dim leading-prose">
        <Text path="library.open.invite" />
      </p>

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
    </>
  );
}
