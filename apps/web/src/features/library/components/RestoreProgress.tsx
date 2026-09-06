import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import { DemoFileName } from './DemoFileName';

interface Props {
  fileName: string;
  /**
   * `null` when the demo is coming out of this device's own store, which is instant. A sample match
   * is a download first, and a reader watching a few megabytes arrive is owed the figure.
   */
  download: { percent: number | null } | null;
  onCancel: () => void;
}

export function RestoreProgress({ fileName, download, onCancel }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-ui font-medium text-20 leading-dense">
        <Text path={download === null ? 'library.cache.restoring' : 'library.cache.downloading'} />
      </h2>

      {/* The percentage is the reading, and it is absent until the server has said how long the
          body is — a figure invented from nothing is worse than the heading alone. */}
      {download?.percent !== null && download !== null && (
        <p className="numeric text-20 leading-dense">
          <Text path="library.cache.downloadPercent" values={{ percent: download.percent }} />
        </p>
      )}

      <DemoFileName fileName={fileName} />

      <Button type="button" variant="outline" className="self-start" onClick={onCancel}>
        <Text path="library.cache.cancel" />
      </Button>
    </section>
  );
}
