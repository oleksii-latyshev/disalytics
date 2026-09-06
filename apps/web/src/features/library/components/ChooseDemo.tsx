import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { useRef } from 'react';
import { ACCEPTED_EXTENSIONS, takeChosenFile } from '../helpers/demo-file';

interface Props {
  onFile: (file: File) => void;
}

/**
 * The way to a file as an ordinary button. The way in's own card is a drop zone that opens the
 * picker when it is pressed, so this is the failure screen's route out and nothing else — that card
 * is a heading, an explanation and a way to try again, and a target the size of the invitation
 * would read as the failure being the thing to press.
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
          const chosen = takeChosenFile(event.target);
          if (chosen) onFile(chosen);
        }}
      />
    </>
  );
}
