import type { Lineup } from '@disa/demo-core';

const IMAGE_FILE = /\.(?:png|jpe?g|webp|gif)(?:\?[^\s]*)?$/i;
const WEB_LINK = /^https?:\/\/[^\s]+$/i;

/** The guide link a lineup carries, when it is a web link at all. */
export function mediaLinkOf(lineup: Lineup): string | null {
  const url = lineup.mediaUrl;

  return url !== undefined && WEB_LINK.test(url) ? url : null;
}

/**
 * The photos of a lineup, in order. A lineup with none of its own falls back to its guide link when
 * that link is itself a picture.
 */
export function photosOf(lineup: Lineup): readonly string[] {
  if (lineup.imageUrls !== undefined && lineup.imageUrls.length > 0) {
    return [...new Set(lineup.imageUrls)];
  }

  const link = mediaLinkOf(lineup);

  return link !== null && IMAGE_FILE.test(link) ? [link] : [];
}

/** The caption of each photo of `photosOf`, by position. */
export function captionsOf(lineup: Lineup): readonly string[] {
  const urls = lineup.imageUrls ?? [];

  return photosOf(lineup).map((url) => lineup.imageCaptions?.[urls.indexOf(url)] ?? '');
}
