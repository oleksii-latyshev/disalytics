import { useEffect, useState } from 'react';
import type { Size, Sizes } from '../helpers/photos';

/**
 * Pixel sizes of photos, read by decoding them off-screen. A photo that does not load simply has no
 * size; sharper-of-a-pair then falls back to the site's.
 */
export function usePhotoSizes(
  refs: readonly string[],
  srcOf: (ref: string) => string | null,
): Sizes {
  const [sizes, setSizes] = useState<ReadonlyMap<string, Size>>(new Map());
  const key = refs.join('\n');

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` names exactly the refs; srcOf only reads the loaded file
  useEffect(() => {
    let current = true;
    const loading: HTMLImageElement[] = [];
    for (const ref of refs) {
      const src = srcOf(ref);
      if (src === null) continue;
      const image = new Image();
      image.addEventListener('load', () => {
        if (!current || image.naturalWidth === 0) return;
        const size = { width: image.naturalWidth, height: image.naturalHeight };
        setSizes((previous) => new Map(previous).set(ref, size));
      });
      image.src = src;
      loading.push(image);
    }
    return () => {
      current = false;
      for (const image of loading) image.src = '';
    };
  }, [key]);

  return sizes;
}
