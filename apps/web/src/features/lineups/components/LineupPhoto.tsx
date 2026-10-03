import type { ComponentPropsWithRef } from 'react';
import { useLineupPhotoSrc } from '../hooks/use-lineup-photo-src';

/** An `<img>` for a lineup photo reference: http(s), blob, or `local:<sha-256>`. */
export function LineupPhoto({
  src,
  alt,
  ...rest
}: Omit<ComponentPropsWithRef<'img'>, 'src' | 'alt'> & {
  readonly src: string;
  readonly alt: string;
}) {
  const resolved = useLineupPhotoSrc(src);
  if (resolved === null) {
    return <span aria-hidden="true" className={rest.className} />;
  }
  return <img src={resolved} alt={alt} {...rest} />;
}
