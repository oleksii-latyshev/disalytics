import { Text } from '@disa/i18n';
import { Button } from '@disa/ui';
import type { SavedTarget } from '../helpers/lineup-targets';
import { LineupTargetRow } from './LineupTargetRow';

interface Props {
  targets: readonly SavedTarget[];
  selectedId: string | null;
  /** Whether the map has any lineups at all, so the empty list can say why it is empty. */
  hasLineups: boolean;
  /** A collection is open, and whether it holds any lineup that exists on this map. */
  collection: { readonly hasMembers: boolean } | null;
  isSelecting: boolean;
  checkedIds: ReadonlySet<string>;
  onPick: (id: string) => void;
  onCheck: (id: string) => void;
  onToggleSelecting: () => void;
}

const HEADING = 'label-dense text-ink-dim';

function emptyPath(hasLineups: boolean, collection: Props['collection']) {
  if (!hasLineups) return 'library.lineups.emptyMap';
  if (collection !== null && !collection.hasMembers)
    return 'library.lineups.collections.emptyCollection';
  return 'library.lineups.empty';
}

/** "Where it lands": every target the filters leave, most positions first. */
export function LineupTargetList(props: Props) {
  const { targets, selectedId, hasLineups, collection, isSelecting, checkedIds } = props;

  return (
    <>
      <div className="flex shrink-0 items-center justify-between gap-2 px-0.5 pt-1">
        <h2 className={HEADING}>
          <Text path="library.lineups.listTitle" />{' '}
          <span className="numeric text-11 text-ink-faint">{targets.length}</span>
        </h2>
        {hasLineups && (
          <Button variant="ghost" onClick={props.onToggleSelecting} className="h-6 px-2 text-11">
            <Text path={isSelecting ? 'library.lineups.selectDone' : 'library.lineups.select'} />
          </Button>
        )}
      </div>

      <ul className="-mx-1 flex min-h-36 flex-1 list-none flex-col gap-1 overflow-y-auto px-1">
        {targets.map((target, index) => (
          <LineupTargetRow
            key={target.id}
            target={target}
            index={index}
            isOn={target.id === selectedId}
            isSelecting={isSelecting}
            isChecked={checkedIds.has(target.id)}
            onPress={isSelecting ? props.onCheck : props.onPick}
          />
        ))}
      </ul>

      {targets.length === 0 && (
        <div className="flex flex-col gap-2 px-2 py-4 text-13 text-ink-dim leading-prose">
          <Text path={emptyPath(hasLineups, collection)} />
          {!hasLineups && <Text path="library.lineups.emptyMapHint" />}
          {hasLineups && collection !== null && !collection.hasMembers && (
            <Text path="library.lineups.collections.emptyCollectionHint" />
          )}
        </div>
      )}
    </>
  );
}
