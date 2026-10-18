import type { Translate } from '@disa/i18n';
import type { FloorId } from '@disa/map-data';

/** A floor's name in the reader's language: the floor switch and the PDF caption say it the same way. */
export function floorName(t: Translate, id: FloorId): string {
  switch (id) {
    case 'upper':
      return t('library.tactics.board.floors.upper');
    case 'lower':
      return t('library.tactics.board.floors.lower');
    case 'underpass':
      return t('library.tactics.board.floors.underpass');
    case 'main':
      return t('library.tactics.board.floors.main');
  }
}
