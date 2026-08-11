import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { DemoFileName } from './DemoFileName';

interface Props {
  fileName: string;
  onCancel: () => void;
}

export function RestoreProgress({ fileName, onCancel }: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-instrument border border-line bg-surface-1 p-6">
      <h2 className="font-ui text-20 leading-dense">
        <Text path="library.cache.restoring" />
      </h2>

      <DemoFileName fileName={fileName} />

      <Button type="button" variant="outline" className="self-start" onClick={onCancel}>
        <Text path="library.progress.cancel" />
      </Button>
    </section>
  );
}
