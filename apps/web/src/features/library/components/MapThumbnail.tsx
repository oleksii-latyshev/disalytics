import { getMapOverview, type RadarTheme, radarAssetPath } from '@disa/map-data';

interface Props {
  map: string;
  theme: RadarTheme;
}

/**
 * The thumbnail is **the same radar asset the plate draws**, in the theme the reader chose, so the
 * grid adds no image to the build. It is the map and not the match — two demos of Mirage look alike
 * here, which is orientation rather than identity, and what is written below it is what tells them
 * apart. A map this build has no overview for simply has no picture; the name still reads.
 */
export function MapThumbnail({ map, theme }: Props) {
  const level = getMapOverview(map)?.levels[0];

  return (
    <span className="block aspect-[16/10] overflow-hidden bg-surface-2">
      {level !== undefined && (
        <img
          src={`${import.meta.env.BASE_URL}${radarAssetPath(level, theme)}`}
          alt=""
          loading="lazy"
          className="size-full scale-105 object-cover opacity-60 transition-[opacity,scale] duration-(--duration-base) ease-out group-hover:scale-110 group-hover:opacity-90"
        />
      )}
    </span>
  );
}
