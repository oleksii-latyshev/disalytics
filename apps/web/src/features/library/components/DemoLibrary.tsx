import type { ParseState } from '@/core/parsing';
import { OpenDemo } from './OpenDemo';
import { ParseFailure } from './ParseFailure';
import { ParseProgress } from './ParseProgress';
import { RestoreProgress } from './RestoreProgress';

interface Props {
  // An opened demo is the workspace's screen rather than the library's, so it never reaches here.
  state: Exclude<ParseState, { status: 'ready' }>;
  onFile: (file: File) => void;
  onClose: () => void;
  isDraggedOver: boolean;
}

/**
 * The card's body. The card itself, and the screen around it, are `WayIn`'s. Saved demos are the
 * Library screen's alone (#379): the card holds the one thing to do, which is take a demo.
 */
export function DemoLibrary({ state, onFile, onClose, isDraggedOver }: Props) {
  switch (state.status) {
    case 'idle':
      return <OpenDemo onFile={onFile} isDraggedOver={isDraggedOver} />;
    case 'restoring':
      return (
        <RestoreProgress fileName={state.fileName} download={state.download} onCancel={onClose} />
      );
    case 'parsing':
      return (
        <ParseProgress
          fileName={state.fileName}
          phase={state.phase}
          percent={state.percent}
          header={state.header}
          wasHidden={state.wasHidden}
          onCancel={onClose}
        />
      );
    // The failure is the same card in the same place, so it replaces the way in rather than
    // sitting above a copy of it. What it keeps is the route out — its own file picker.
    case 'failed':
      return <ParseFailure failure={state.failure} fileName={state.fileName} onFile={onFile} />;
  }
}
