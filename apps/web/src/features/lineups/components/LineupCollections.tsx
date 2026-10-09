import { isCollectionNameTaken, type LineupCollection } from '@disa/demo-core';
import { Text, useT } from '@disa/i18n';
import { Button, Menu, MenuItem, MenuPanel, MenuTrigger } from '@disa/ui';
import { Folder, FolderOpen, MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import { LineupCollectionName } from './LineupCollectionName';

type Editing = { readonly kind: 'create' } | { readonly kind: 'rename'; readonly id: string };

interface Props {
  collections: readonly LineupCollection[];
  /** Per collection id, how many of its lineups exist on this map. */
  counts: ReadonlyMap<string, number>;
  totalCount: number;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (collection: LineupCollection) => void;
}

const ROW =
  'flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-card border px-2 py-1 text-left text-13 transition-colors duration-(--duration-micro) ease-out';

function rowTone(isOn: boolean) {
  return isOn
    ? 'border-line-strong bg-selected font-medium text-ink'
    : 'border-transparent text-ink-dim hover:bg-hover hover:text-ink';
}

/** The map's collections beside "All lineups": pick one and the map shows only what it holds. */
export function LineupCollections(props: Props) {
  const { collections, counts, totalCount, activeId } = props;
  const t = useT();
  const [editing, setEditing] = useState<Editing | null>(null);
  const done = () => setEditing(null);

  return (
    <section
      aria-label={t('library.lineups.collections.nav')}
      className="flex min-w-0 flex-col gap-1"
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h2 className="label-dense text-ink-dim">
          <Text path="library.lineups.collections.title" />
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditing({ kind: 'create' })}
          aria-label={t('library.lineups.collections.new')}
          className="size-6"
        >
          <Plus aria-hidden="true" className="size-3.5" />
        </Button>
      </div>

      <ul className="-mx-1 flex max-h-40 min-h-0 list-none flex-col gap-0.5 overflow-y-auto px-1">
        <li className="flex">
          <button
            type="button"
            aria-pressed={activeId === null}
            onClick={() => props.onSelect(null)}
            className={`${ROW} ${rowTone(activeId === null)}`}
          >
            <Folder aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              <Text path="library.lineups.collections.all" />
            </span>
            <span className="numeric text-11 text-ink-dim">{totalCount}</span>
          </button>
        </li>

        {collections.map((collection) => {
          const isOn = collection.id === activeId;
          const count = counts.get(collection.id) ?? 0;

          if (editing?.kind === 'rename' && editing.id === collection.id) {
            return (
              <li key={collection.id}>
                <LineupCollectionName
                  initialName={collection.name}
                  submitPath="library.lineups.collections.save"
                  isTaken={(name) => isCollectionNameTaken(collections, name, collection.id)}
                  onSubmit={(name) => {
                    props.onRename(collection.id, name);
                    done();
                  }}
                  onCancel={done}
                />
              </li>
            );
          }

          return (
            <li key={collection.id} className="flex items-center gap-0.5">
              <button
                type="button"
                aria-pressed={isOn}
                aria-label={t('library.lineups.collections.rowAria', {
                  name: collection.name,
                  count,
                })}
                onClick={() => props.onSelect(collection.id)}
                className={`${ROW} ${rowTone(isOn)}`}
              >
                {isOn ? (
                  <FolderOpen aria-hidden="true" className="size-4 shrink-0" />
                ) : (
                  <Folder aria-hidden="true" className="size-4 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{collection.name}</span>
                <span className="numeric text-11 text-ink-dim">{count}</span>
              </button>
              <Menu>
                <MenuTrigger
                  aria-label={t('library.lineups.collections.actions', { name: collection.name })}
                  className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-card text-ink-dim transition-colors duration-(--duration-micro) ease-out hover:bg-hover hover:text-ink"
                >
                  <MoreHorizontal aria-hidden="true" className="size-4" />
                </MenuTrigger>
                <MenuPanel align="end">
                  <MenuItem onClick={() => setEditing({ kind: 'rename', id: collection.id })}>
                    <Text path="library.lineups.collections.rename" />
                  </MenuItem>
                  <MenuItem variant="destructive" onClick={() => props.onDelete(collection)}>
                    <Text path="library.lineups.collections.delete" />
                  </MenuItem>
                </MenuPanel>
              </Menu>
            </li>
          );
        })}
      </ul>

      {editing?.kind === 'create' && (
        <LineupCollectionName
          initialName=""
          submitPath="library.lineups.collections.create"
          isTaken={(name) => isCollectionNameTaken(collections, name)}
          onSubmit={(name) => {
            props.onCreate(name);
            done();
          }}
          onCancel={done}
        />
      )}

      {collections.length === 0 && editing === null && (
        <p className="px-1 text-12 text-ink-dim leading-prose">
          <Text path="library.lineups.collections.empty" />
        </p>
      )}
    </section>
  );
}
