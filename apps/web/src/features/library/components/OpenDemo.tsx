import { Text, useT } from '@disa/i18n';
import { useRef } from 'react';
import { ACCEPTED_EXTENSIONS, takeChosenFile } from '../helpers/demo-file';
import { CardMascot } from './CardMascot';
import { DemoFolderHint } from './DemoFolderHint';

interface Props {
  onFile: (file: File) => void;
  isDraggedOver: boolean;
}

/**
 * **The invitation is the target.** It used to be a line of copy above a button, which asked the
 * reader to read a sentence about dropping a file and then press something else; the card's whole
 * body is the thing to drop onto and the thing to press now, and the mascot in the middle of it is
 * what says so without a second sentence.
 *
 * The drop itself is still the window's — `useFileDrop` listens there, because a drop the page does
 * not take responsibility for navigates away to the file — so this target is what the *pointer* is
 * offered, not what the drag is limited to.
 *
 * It is a plain `button` rather than the shared one: that component is a control in a row of
 * controls, and this is a region the size of the card. Focus is not styled here either way —
 * `base.css` puts the product's outline on `:focus-visible` for every element there is.
 */
export function OpenDemo({ onFile, isDraggedOver }: Props) {
  const t = useT();
  const picker = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* A sibling of the target rather than a child of it, so pressing it opens the folder note
          instead of the file picker. It is positioned against the card, which is the nearest
          positioned ancestor — `.surface-sweep` is what makes it one. */}
      <DemoFolderHint />

      <button
        type="button"
        aria-label={t('library.open.action')}
        onClick={() => picker.current?.click()}
        className="flex w-full cursor-pointer flex-col items-center gap-3 rounded-card px-4 py-5 transition-colors duration-(--duration-micro) ease-out hover:bg-hover"
      >
        <CardMascot isLifted={isDraggedOver} />

        <span className="text-center text-14 text-ink">
          <Text path={isDraggedOver ? 'library.open.release' : 'library.open.invite'} />
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
    </>
  );
}
