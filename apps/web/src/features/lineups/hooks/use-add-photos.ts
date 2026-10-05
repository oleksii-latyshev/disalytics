import { useCallback, useEffect, useRef, useState } from 'react';
import { prepareLineupImage } from '../helpers/prepare-image';
import type { PreparedImage } from '../helpers/prepared-image';

/**
 * The screenshots chosen for a lineup that is not saved yet: converted once, shown from object
 * URLs that are let go when they are removed or the flow ends.
 */
export function useAddPhotos() {
  const [images, setImages] = useState<readonly PreparedImage[]>([]);
  const [hasFailed, setHasFailed] = useState(false);
  const urls = useRef(new Set<string>());

  useEffect(() => {
    const held = urls.current;

    return () => {
      for (const url of held) URL.revokeObjectURL(url);
      held.clear();
    };
  }, []);

  const add = useCallback(async (files: readonly File[]) => {
    if (files.length === 0) return;

    try {
      const prepared = await Promise.all(files.map(prepareLineupImage));
      const added = prepared.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        caption: '',
      }));
      for (const image of added) urls.current.add(image.previewUrl);
      setImages((previous) => [...previous, ...added]);
      setHasFailed(false);
    } catch {
      setHasFailed(true);
    }
  }, []);

  const remove = (index: number) => {
    setImages((previous) => {
      const gone = previous[index];
      if (gone !== undefined) {
        URL.revokeObjectURL(gone.previewUrl);
        urls.current.delete(gone.previewUrl);
      }
      return previous.filter((_, position) => position !== index);
    });
  };

  return { images, hasFailed, add, remove };
}
