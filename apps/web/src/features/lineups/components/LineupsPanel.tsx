import type { Lineup, LineupGroupTarget } from '@disa/demo-core';
import { useT } from '@disa/i18n';
import type { AddDraft } from '../helpers/lineup-add';
import type { SavedTarget, SavedVariant } from '../helpers/lineup-targets';
import type { PreparedImage } from '../helpers/prepared-image';
import { LineupAddPanel } from './LineupAddPanel';
import { LineupEditPanel } from './LineupEditPanel';
import { LineupIntroPanel } from './LineupIntroPanel';
import { LineupTargetPanel } from './LineupTargetPanel';

export type PanelMode =
  | { readonly kind: 'intro' }
  | { readonly kind: 'target'; readonly target: SavedTarget; readonly variant: SavedVariant }
  | { readonly kind: 'edit'; readonly target: SavedTarget; readonly variant: SavedVariant }
  | { readonly kind: 'add'; readonly draft: AddDraft };

/** What the column is for: adding wins over anything picked, and a picked position is read or edited. */
export function panelModeOf(
  draft: AddDraft | null,
  target: SavedTarget | null,
  variant: SavedVariant | null,
  isEditing: boolean,
): PanelMode {
  if (draft !== null) return { kind: 'add', draft };
  if (target === null || variant === null) return { kind: 'intro' };

  return { kind: isEditing ? 'edit' : 'target', target, variant };
}

export interface PanelActions {
  onPick: (id: string) => void;
  onHoverVariant: (id: string | null) => void;
  onOpenVariant: (id: string) => void;
  onClose: () => void;
  onAdd: () => void;
  onEdit: () => void;
  onAnother: () => void;
  onDone: () => void;
  onDetails: (lineup: Lineup) => void;
  onAddBounce: (lineup: Lineup) => void;
  onRemoveBounce: (lineup: Lineup, index: number) => void;
  onUngroup: (lineup: Lineup, groupTarget: LineupGroupTarget) => void;
  onDelete: (lineup: Lineup) => void;
  onDraft: (patch: Partial<AddDraft>) => void;
  onRedo: (point: 'landing' | 'origin') => void;
  onSave: (photos: readonly PreparedImage[]) => void;
  onCancelAdd: () => void;
}

interface Props {
  map: string;
  mode: PanelMode;
  /** What the intro offers to start from. */
  targets: readonly SavedTarget[];
  isSaving: boolean;
  hasFailed: boolean;
  /** The position hovered on the map or in the list, so the list lights the same one. */
  hoveredVariantId: string | null;
  actions: PanelActions;
}

/** The right column: it is whatever the reader is doing — nothing yet, reading one, editing one, or adding one. */
export function LineupsPanel({
  map,
  mode,
  targets,
  isSaving,
  hasFailed,
  hoveredVariantId,
  actions,
}: Props) {
  const t = useT();

  return (
    <section
      aria-label={t('library.lineups.panel')}
      className="surface-card flex min-h-0 min-w-0 flex-col overflow-hidden rounded-float"
    >
      {mode.kind === 'intro' && (
        <LineupIntroPanel targets={targets} onPick={actions.onPick} onAdd={actions.onAdd} />
      )}
      {mode.kind === 'target' && (
        <LineupTargetPanel
          map={map}
          target={mode.target}
          variant={mode.variant}
          hoveredId={hoveredVariantId}
          onHover={actions.onHoverVariant}
          onOpenVariant={actions.onOpenVariant}
          onClose={actions.onClose}
          onEdit={actions.onEdit}
          onAnother={actions.onAnother}
        />
      )}
      {mode.kind === 'edit' && (
        <LineupEditPanel
          lineup={mode.variant.lineup}
          onDone={actions.onDone}
          onDetails={() => actions.onDetails(mode.variant.lineup)}
          onAddBounce={() => actions.onAddBounce(mode.variant.lineup)}
          onRemoveBounce={(index) => actions.onRemoveBounce(mode.variant.lineup, index)}
          onUngroup={(groupTarget) => actions.onUngroup(mode.variant.lineup, groupTarget)}
          onDelete={() => actions.onDelete(mode.variant.lineup)}
        />
      )}
      {mode.kind === 'add' && (
        <LineupAddPanel
          map={map}
          draft={mode.draft}
          isSaving={isSaving}
          hasFailed={hasFailed}
          onDraft={actions.onDraft}
          onRedo={actions.onRedo}
          onSave={actions.onSave}
          onCancel={actions.onCancelAdd}
        />
      )}
    </section>
  );
}
