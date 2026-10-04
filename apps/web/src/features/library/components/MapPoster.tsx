import { getMapOverview, type RadarTheme, radarAssetPath } from '@disa/map-data';

/**
 * The map, behind the card rather than above it — **the same radar asset the plate draws**, in the
 * theme the reader chose, so the wall adds no image to the build.
 *
 * It is the map and not the match: two demos of Mirage look alike here, which is orientation rather
 * than identity, and what is written over it is what tells them apart. A map this build has no
 * overview for simply has no picture, and the card reads on its own ground.
 *
 * **The scrim is what makes the words legible**, and it is a gradient rather than a flat wash so the
 * top of the picture stays a picture. Measured by worst pixel over the brightest asset the product
 * ships, every reading on the card holds §14's floor — the mean is what said #332's hero was fine
 * when one cell behind a glyph read 2.73.
 */
export function MapPoster({
  map,
  theme,
  clear = false,
}: {
  map: string;
  theme: RadarTheme;
  /** A picture to recognise rather than a ground to write on: brighter, with only a low shade. */
  clear?: boolean;
}) {
  const level = getMapOverview(map)?.levels[0];

  return (
    <>
      {level !== undefined && (
        <img
          src={`${import.meta.env.BASE_URL}${radarAssetPath(level, theme)}`}
          alt=""
          loading="lazy"
          className={`absolute inset-0 size-full scale-105 object-cover ${clear ? 'opacity-95' : 'opacity-55 group-hover:opacity-80'} transition-[opacity,scale] duration-(--duration-base) ease-out group-hover:scale-110`}
        />
      )}

      <span
        aria-hidden="true"
        className={
          clear
            ? 'absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_srgb,var(--color-surface-0)_55%,transparent)_0%,transparent_40%)]'
            : 'absolute inset-0 bg-[linear-gradient(to_top,var(--color-surface-0)_10%,color-mix(in_srgb,var(--color-surface-0)_78%,transparent)_46%,color-mix(in_srgb,var(--color-surface-0)_12%,transparent)_100%)]'
        }
      />
    </>
  );
}
