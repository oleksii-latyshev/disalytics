import { Text } from '@disa/i18n';
import { ChooseDemo } from './ChooseDemo';

interface Props {
  onFile: (file: File) => void;
  isDraggedOver: boolean;
}

export function OpenDemo({ onFile, isDraggedOver }: Props) {
  return (
    <div className="flex flex-col items-start gap-4">
      <h2 className="font-ui text-20 leading-dense">
        <Text path="library.open.title" />
      </h2>
      <p className="text-13 text-ink-dim leading-prose">
        <Text path={isDraggedOver ? 'library.open.release' : 'library.open.hint'} />
      </p>

      <ChooseDemo onFile={onFile} />
    </div>
  );
}
