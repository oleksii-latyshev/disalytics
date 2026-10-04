import type { ReactNode } from 'react';
import { useRef } from 'react';
import { ACCEPTED_EXTENSIONS, takeChosenFile } from '../../helpers/demo-file';

interface Props {
  onFile: (file: File) => void;
  className: string;
  children: ReactNode;
  ariaLabel?: string;
}

/** A button that opens the file picker, and the input it opens. */
export function PickDemoButton({ onFile, className, children, ariaLabel }: Props) {
  const picker = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => picker.current?.click()}
        className={className}
      >
        {children}
      </button>
      <input
        ref={picker}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        tabIndex={-1}
        className="hidden"
        onChange={(event) => {
          const chosen = takeChosenFile(event.target);
          if (chosen) onFile(chosen);
        }}
      />
    </>
  );
}
