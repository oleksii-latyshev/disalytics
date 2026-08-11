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

/** The card's body. The card itself, and the screen around it, are `WayIn`'s. */
export function DemoLibrary({ state, onFile, onClose, isDraggedOver }: Props) {
  switch (state.status) {
    case 'idle':
      return <OpenDemo onFile={onFile} isDraggedOver={isDraggedOver} />;
    case 'restoring':
      return <RestoreProgress fileName={state.fileName} onCancel={onClose} />;
    case 'parsing':
      return (
        <ParseProgress
          fileName={state.fileName}
          phase={state.phase}
          percent={state.percent}
          header={state.header}
          onCancel={onClose}
        />
      );
    case 'failed':
      return (
        <div className="flex flex-col gap-6">
          <ParseFailure code={state.code} fileName={state.fileName} />
          <OpenDemo onFile={onFile} isDraggedOver={isDraggedOver} />
        </div>
      );
  }
}
