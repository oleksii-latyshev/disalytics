import { DEFAULT_RADAR_THEME, getMapOverview, radarAssetPath } from '@disa/map-data';

// The material of the product rather than an illustration. One plate, fixed, because this screen has
// no demo yet and so no map of its own to show; Mirage is the one most readers can name at a glance.
const BACKDROP_MAP = 'de_mirage';

/**
 * The plate bleeds past the viewport on both axes — `cover` on a square image guarantees it — and
 * sits far enough down that the card above it never has to fight for contrast. It is decorative in
 * placement only, so it carries no alternative text.
 */
export function PlateBackdrop({ isLifted }: { isLifted: boolean }) {
  const overview = getMapOverview(BACKDROP_MAP);
  if (overview === undefined) return null;

  const [level] = overview.levels;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <img
        src={`${import.meta.env.BASE_URL}${radarAssetPath(level, DEFAULT_RADAR_THEME)}`}
        alt=""
        className={`size-full scale-110 object-cover transition-opacity duration-(--duration-panel) ease-out ${
          isLifted ? 'opacity-30' : 'opacity-15'
        }`}
      />
    </div>
  );
}
