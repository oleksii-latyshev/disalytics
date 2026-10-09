import type { PreparedImage } from './prepared-image';

/** One entry of the form's photo list: already saved (a link or a `local:` ref) or a file picked but not stored yet. */
export type FormPhoto =
  | { readonly kind: 'stored'; readonly url: string; readonly caption: string }
  | { readonly kind: 'prepared'; readonly image: PreparedImage };

export function photoCaption(photo: FormPhoto): string {
  return photo.kind === 'stored' ? photo.caption : photo.image.caption;
}

export function withPhotoCaption(photo: FormPhoto, caption: string): FormPhoto {
  return photo.kind === 'stored'
    ? { ...photo, caption }
    : { ...photo, image: { ...photo.image, caption } };
}

export function storedPhotosOf(
  imageUrls: readonly string[],
  imageCaptions: readonly string[],
): readonly FormPhoto[] {
  return imageUrls.map((url, index) => ({
    kind: 'stored',
    url,
    caption: imageCaptions[index] ?? '',
  }));
}

export function preparedImagesOf(photos: readonly FormPhoto[]): readonly PreparedImage[] {
  return photos.flatMap((photo) => (photo.kind === 'prepared' ? [photo.image] : []));
}

export function storedUrlsOf(photos: readonly FormPhoto[]): readonly string[] {
  return photos.flatMap((photo) => (photo.kind === 'stored' ? [photo.url] : []));
}

export function hasPreparedPhotos(photos: readonly FormPhoto[]): boolean {
  return photos.some((photo) => photo.kind === 'prepared');
}

/**
 * Pastes a link where the first picked file sits (the catbox workflow: upload that file by hand,
 * paste its link). Without a picked file the link goes last; a link already listed only drops the file.
 */
export function withPhotoLink(
  photos: readonly FormPhoto[],
  url: string,
): { readonly photos: readonly FormPhoto[]; readonly replaced: PreparedImage | null } {
  const at = photos.findIndex((photo) => photo.kind === 'prepared');
  const first = photos[at];
  const isListed = storedUrlsOf(photos).includes(url);
  if (first === undefined || first.kind !== 'prepared') {
    return {
      photos: isListed ? photos : [...photos, { kind: 'stored', url, caption: '' }],
      replaced: null,
    };
  }
  const link: FormPhoto = { kind: 'stored', url, caption: first.image.caption };
  return {
    photos: isListed
      ? photos.filter((_, index) => index !== at)
      : photos.map((photo, index) => (index === at ? link : photo)),
    replaced: first.image,
  };
}

/**
 * The saved order: stored photos keep their place, each picked file takes its `local:` ref
 * (`refs` follow the picked files' order) at its own place. A ref seen twice is kept once.
 */
export function resolvePhotos(
  photos: readonly FormPhoto[],
  refs: readonly string[],
): { readonly imageUrls: readonly string[]; readonly imageCaptions: readonly string[] } {
  const imageUrls: string[] = [];
  const imageCaptions: string[] = [];
  let preparedIndex = 0;
  for (const photo of photos) {
    let url: string | undefined;
    if (photo.kind === 'stored') {
      url = photo.url;
    } else {
      url = refs[preparedIndex];
      preparedIndex += 1;
    }
    if (url === undefined || imageUrls.includes(url)) continue;
    imageUrls.push(url);
    imageCaptions.push(photoCaption(photo));
  }
  return { imageUrls, imageCaptions };
}
