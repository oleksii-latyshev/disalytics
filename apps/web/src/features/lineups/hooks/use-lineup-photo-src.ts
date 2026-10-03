import { isLocalImageRef } from '@disa/demo-core';
import { useEffect, useState } from 'react';
import { cachedLocalPhotoUrl, resolveLocalPhotoUrl } from '../helpers/lineup-photo-urls';

/** http(s) and blob URLs pass through; a `local:` ref resolves to an object URL, or null. */
export function useLineupPhotoSrc(url: string): string | null {
  const local = isLocalImageRef(url);
  const [resolvedUrl, setResolvedUrl] = useState<{ ref: string; src: string | null } | null>(() =>
    local ? { ref: url, src: cachedLocalPhotoUrl(url) ?? null } : null,
  );

  useEffect(() => {
    if (!local) return;
    let cancelled = false;
    void resolveLocalPhotoUrl(url).then((src) => {
      if (!cancelled) setResolvedUrl({ ref: url, src });
    });
    return () => {
      cancelled = true;
    };
  }, [local, url]);

  if (!local) return url;
  return resolvedUrl?.ref === url ? resolvedUrl.src : (cachedLocalPhotoUrl(url) ?? null);
}
