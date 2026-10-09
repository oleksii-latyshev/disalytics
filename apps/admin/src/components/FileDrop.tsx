import { Text, useT } from '@disa/i18n';
import { Button, cn } from '@disa/ui';
import { type DragEvent, useRef, useState } from 'react';
import type { LoadedFile } from '../helpers/lineup-file';

/** A drop target that is also a button: the file input behind it is what the keyboard reaches. */
export function FileDrop({
  file,
  onFile,
}: {
  file: LoadedFile | null;
  onFile: (name: string, text: string) => void;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const read = async (picked: File | undefined) => {
    if (picked === undefined) return;
    onFile(picked.name, await picked.text());
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    void read(event.dataTransfer.files[0]);
  };

  return (
    <fieldset
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'm-0 flex min-w-0 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong px-4 py-8 text-center transition-[background-color,border-color] duration-(--duration-micro)',
        over && 'border-ink bg-hover',
      )}
    >
      <legend className="sr-only">{t('admin.file.drop')}</legend>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        data-testid="lineups-file"
        onChange={(event) => {
          void read(event.currentTarget.files?.[0]);
          event.currentTarget.value = '';
        }}
      />
      {file === null ? (
        <>
          <p className="text-13 text-ink">
            <Text path="admin.file.drop" />
          </p>
          <p className="text-12 text-ink-faint">
            <Text path="admin.file.or" />
          </p>
        </>
      ) : (
        <p className="numeric text-13 text-ink">
          <Text
            path="admin.file.summary"
            values={{ name: file.name, count: file.lineups.length }}
          />
        </p>
      )}
      <Button
        variant={file === null ? 'primary' : 'outline'}
        onClick={() => input.current?.click()}
      >
        <Text path={file === null ? 'admin.file.choose' : 'admin.file.replace'} />
      </Button>
    </fieldset>
  );
}
