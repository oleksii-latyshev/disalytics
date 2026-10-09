import { isCollectionNameTaken, type LineupCollection } from '@disa/demo-core';
import { Text } from '@disa/i18n';
import { Button, Popover, PopoverPanel, PopoverTrigger } from '@disa/ui';
import { Check, FolderPlus, Minus } from 'lucide-react';
import { useState } from 'react';
import { membershipOf } from '../helpers/lineup-collection-membership';
import { LineupCollectionName } from './LineupCollectionName';

interface Props {
  collections: readonly LineupCollection[];
  /** The lineups the choice is about: one position, or everything ticked. */
  lineupIds: readonly string[];
  /** The trigger's words, so a bar can say "Add to collection" and a panel "Collections". */
  triggerPath: 'library.lineups.collections.add' | 'library.lineups.collections.title';
  className?: string;
  /** Puts the lineups in the collection, or takes them out when it already holds all of them. */
  onToggle: (collectionId: string, lineupIds: readonly string[]) => void;
  /** A new collection that starts with these lineups in it. */
  onCreate: (name: string, lineupIds: readonly string[]) => void;
}

/** A list of the map's collections to put lineups in or take them out of, ending in a name field for a new one. */
export function LineupCollectionPicker({
  collections,
  lineupIds,
  triggerPath,
  className,
  onToggle,
  onCreate,
}: Props) {
  const [isNaming, setIsNaming] = useState(false);

  return (
    <Popover
      onOpenChange={(isOpen) => {
        if (!isOpen) setIsNaming(false);
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="outline" className={className}>
            <FolderPlus aria-hidden="true" className="size-3.5" />
            <Text path={triggerPath} />
          </Button>
        }
      />

      <PopoverPanel
        align="start"
        className="surface-card flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 rounded-float border-0 p-3 shadow-none"
      >
        <h2 className="font-semibold text-13 text-ink">
          <Text path="library.lineups.collections.pickerTitle" />
        </h2>
        <p className="text-12 text-ink-dim leading-prose">
          <Text
            path={
              collections.length === 0
                ? 'library.lineups.collections.pickerEmpty'
                : 'library.lineups.collections.pickerHint'
            }
          />
        </p>

        {collections.length > 0 && (
          <ul className="-mx-1 flex max-h-48 list-none flex-col gap-0.5 overflow-y-auto px-1">
            {collections.map((collection) => {
              const membership = membershipOf(collection, lineupIds);

              return (
                <li key={collection.id}>
                  <button
                    type="button"
                    aria-pressed={
                      membership === 'all' ? true : membership === 'some' ? 'mixed' : false
                    }
                    onClick={() => onToggle(collection.id, lineupIds)}
                    className="flex min-h-9 w-full cursor-pointer items-center gap-2 rounded-card px-2 py-1 text-left text-13 text-ink transition-colors duration-(--duration-micro) ease-out hover:bg-hover"
                  >
                    <span className="grid size-4 shrink-0 place-items-center rounded-chip border border-line-strong">
                      {membership === 'all' && <Check aria-hidden="true" className="size-3" />}
                      {membership === 'some' && <Minus aria-hidden="true" className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                    {membership === 'some' && (
                      <span className="sr-only">
                        <Text path="library.lineups.collections.partly" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {isNaming ? (
          <LineupCollectionName
            initialName=""
            submitPath="library.lineups.collections.createWith"
            isTaken={(name) => isCollectionNameTaken(collections, name)}
            onSubmit={(name) => {
              onCreate(name, lineupIds);
              setIsNaming(false);
            }}
            onCancel={() => setIsNaming(false)}
          />
        ) : (
          <Button
            variant="ghost"
            onClick={() => setIsNaming(true)}
            className="h-8 justify-start px-2 text-13"
          >
            <FolderPlus aria-hidden="true" className="size-3.5" />
            <Text path="library.lineups.collections.newCollection" />
          </Button>
        )}
      </PopoverPanel>
    </Popover>
  );
}
