import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useRef } from 'react';

// The container is identified from magic bytes, not from the name, so this only narrows the
// picker's default filter — a renamed demo still opens.
const ACCEPTED_EXTENSIONS = '.dem,.dem.zst,.dem.bz2';

interface Props {
  onFile: (file: File) => void;
}

/**
 * The way to a file, wherever the card happens to be. It is its own component because §10.4's
 * failure screen is the same card in the same place and has to offer the same route out — and a
 * second copy of `OpenDemo` there would put its heading on screen under the error's.
 */
export function ChooseDemo({ onFile }: Props) {
  const picker = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button type="button" variant="primary" size="lg" onClick={() => picker.current?.click()}>
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
    </>
  );
}
