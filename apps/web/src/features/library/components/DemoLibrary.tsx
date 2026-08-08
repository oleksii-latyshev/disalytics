import { useDemoParse } from '@/core/parsing';
import { MatchSummary } from './MatchSummary';
import { OpenDemo } from './OpenDemo';
import { ParseFailure } from './ParseFailure';
import { ParseProgress } from './ParseProgress';
import { RestoreProgress } from './RestoreProgress';

export function DemoLibrary() {
  const { state, open, close } = useDemoParse();

  switch (state.status) {
    case 'idle':
      return <OpenDemo onFile={open} />;
    case 'restoring':
      return <RestoreProgress fileName={state.fileName} onCancel={close} />;
    case 'parsing':
      return (
        <ParseProgress
          fileName={state.fileName}
          phase={state.phase}
          percent={state.percent}
          header={state.header}
          onCancel={close}
        />
      );
    case 'ready':
      return (
        <MatchSummary
          demo={state.demo}
          fileName={state.fileName}
          cache={state.cache}
          onClose={close}
        />
      );
    case 'failed':
      return (
        <div className="flex flex-col gap-4">
          <ParseFailure code={state.code} fileName={state.fileName} />
          <OpenDemo onFile={open} />
        </div>
      );
  }
}
