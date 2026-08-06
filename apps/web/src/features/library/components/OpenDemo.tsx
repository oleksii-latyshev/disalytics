import { Text } from '@disa/i18n';
import { cn } from '@disa/ui';
import { useRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import { useFileDrop } from '../hooks/use-file-drop';

// The container is identified from magic bytes, not from the name, so this only narrows the
// picker's default filter — a renamed demo still opens.
const ACCEPTED_EXTENSIONS = '.dem,.dem.zst,.dem.bz2';

interface Props {
  onFile: (file: File) => void;
}

export function OpenDemo({ onFile }: Props) {
  const picker = useRef<HTMLInputElement>(null);
  const isDraggedOver = useFileDrop(onFile);

  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 rounded-instrument border border-dashed bg-surface-1 px-8 py-12 text-center',
        isDraggedOver ? 'border-focus' : 'border-line',
      )}
    >
      <h2 className="font-ui text-20 leading-dense">
        <Text path="library.open.title" />
      </h2>
      <p className="max-w-[46ch] text-13 text-ink-dim leading-prose">
        <Text path={isDraggedOver ? 'library.open.release' : 'library.open.hint'} />
      </p>
      <Button type="button" onClick={() => picker.current?.click()}>
        <Text path="library.open.action" />
      </Button>
      <input
        ref={picker}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={(event) => {
          const chosen = event.target.files?.item(0);
          // Cleared so choosing the same file twice in a row still reaches onFile.
          event.target.value = '';
          if (chosen) onFile(chosen);
        }}
      />
    </div>
  );
}
