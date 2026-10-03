import type {
  TacticDrawingStroke,
  TacticSide,
  TacticStep,
  TacticThrow,
  UtilityKind,
} from '@disa/demo-core';

export interface TacticPlateProps {
  readonly map: string;
  readonly side?: TacticSide | undefined;
  readonly steps: readonly TacticStep[];
  readonly activeStepIndex?: number | undefined;
  readonly currentTime?: number | undefined;
  readonly selectedSlot?: number | null | undefined;
  readonly selectedThrowId?: string | null | undefined;
  readonly onSelectSlot?: ((slot: number | null) => void) | undefined;
  readonly onSelectThrow?: ((throwId: string | null) => void) | undefined;
  readonly onPlayerDrag?:
    | ((slot: number, worldPoint: { x: number; y: number }) => void)
    | undefined;
  readonly onThrowDrag?:
    | ((throwId: string, end: 'from' | 'to', worldPoint: { x: number; y: number }) => void)
    | undefined;
  readonly onPlateClick?: ((worldPoint: { x: number; y: number }) => void) | undefined;
  readonly isEditable?: boolean | undefined;
  readonly levelIndex?: number | undefined;
  readonly className?: string | undefined;

  readonly activeTool?: 'select' | 'pencil' | 'throw' | 'eraser' | undefined;
  readonly pencilColor?: string | undefined;
  readonly newThrowKind?: UtilityKind | undefined;
  readonly onAddDrawingStroke?: ((stroke: TacticDrawingStroke) => void) | undefined;
  readonly onAddThrow?:
    | ((throwData: Partial<TacticThrow> & Pick<TacticThrow, 'kind' | 'from' | 'to'>) => void)
    | undefined;
  readonly onDeleteThrow?: ((throwId: string) => void) | undefined;
  readonly onDeleteDrawingStroke?: ((index: number) => void) | undefined;
}
