import type { SavedDemo } from '@disa/demo-store';
import type { SampleMatch } from '@/core/samples';
import type { WidgetSize } from '../../helpers/home-widgets';
import type { HomeData } from '../../hooks/use-home-data';

export interface HomeActions {
  onEnter: (demo: SavedDemo, roundIndex: number) => void;
  onSample: (sample: SampleMatch) => void;
  onFile: (file: File) => void;
}

export interface WidgetProps {
  size: WidgetSize;
  data: HomeData;
  actions: HomeActions;
}
