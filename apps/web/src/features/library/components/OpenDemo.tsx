import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useRef } from 'react';

// The container is identified from magic bytes, not from the name, so this only narrows the
// picker's default filter — a renamed demo still opens.
const ACCEPTED_EXTENSIONS = '.dem,.dem.zst,.dem.bz2';

interface Props {
  onFile: (file: File) => void;
  isDraggedOver: boolean;
}

export function OpenDemo({ onFile, isDraggedOver }: Props) {
  const picker = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-start gap-4">
      <h2 className="font-ui text-20 leading-dense">
        <Text path="library.open.title" />
      </h2>
      <p className="text-13 text-ink-dim leading-prose">
        <Text path={isDraggedOver ? 'library.open.release' : 'library.open.hint'} />
      </p>
      <Button type="button" variant="accent" size="lg" onClick={() => picker.current?.click()}>
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
