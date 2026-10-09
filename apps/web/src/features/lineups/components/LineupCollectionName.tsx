import { MAX_COLLECTION_NAME_LENGTH } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, Input } from '@disa/ui';
import { useId, useState } from 'react';

interface Props {
  initialName: string;
  submitPath:
    | 'library.lineups.collections.create'
    | 'library.lineups.collections.createWith'
    | 'library.lineups.collections.save';
  /** Whether another collection already has this name. */
  isTaken: (name: string) => boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

/** A collection's name, typed in place: Enter keeps it, Escape leaves it as it was. */
export function LineupCollectionName({
  initialName,
  submitPath,
  isTaken,
  onSubmit,
  onCancel,
}: Props) {
  const t = useT();
  const errorId = useId();
  const [name, setName] = useState(initialName);
  const taken = isTaken(name);
  const canSubmit = name.trim() !== '' && !taken;

  return (
    <form
      data-shortcuts-suspended
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit(name);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={MAX_COLLECTION_NAME_LENGTH}
        autoFocus
        aria-label={t('library.lineups.collections.nameLabel')}
        placeholder={t('library.lineups.collections.namePlaceholder')}
        aria-invalid={taken}
        aria-describedby={taken ? errorId : undefined}
      />
      {taken && (
        <p id={errorId} role="alert" className="text-11 text-destructive leading-prose">
          <Text path="library.lineups.collections.nameTaken" />
        </p>
      )}
      <div className="flex gap-1.5">
        <Button type="submit" disabled={!canSubmit} className="h-7 flex-1 px-2 text-12">
          <Text path={submitPath} />
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="h-7 px-2 text-12">
          <Text path="library.lineups.collections.cancel" />
        </Button>
      </div>
    </form>
  );
}
