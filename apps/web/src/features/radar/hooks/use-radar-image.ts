import { useEffect, useState } from 'react';

export type RadarImageState =
  | { status: 'loading' }
  | { status: 'ready'; image: HTMLImageElement }
  | { status: 'failed' };

const LOADING: RadarImageState = { status: 'loading' };

/**
 * Fetches a radar image as a decoded `HTMLImageElement`. The images are static assets served under
 * the app's own base — `AGENTS.md` §9 keeps them out of the JS graph, so there is no import to
 * resolve and the path is built at runtime.
 */
export function useRadarImage(assetPath: string): RadarImageState {
  const [state, setState] = useState<RadarImageState>(LOADING);

  useEffect(() => {
    setState(LOADING);

    const image = new Image();
    let isCurrent = true;

    image.addEventListener('load', () => {
      if (isCurrent) setState({ status: 'ready', image });
    });
    image.addEventListener('error', () => {
      if (isCurrent) setState({ status: 'failed' });
    });

    image.src = `${import.meta.env.BASE_URL}${assetPath}`;

    return () => {
      isCurrent = false;
    };
  }, [assetPath]);

  return state;
}

export type RadarImagesState =
  | { status: 'loading' }
  | { status: 'ready'; images: readonly HTMLImageElement[] }
  | { status: 'failed' };

const IMAGES_LOADING: RadarImagesState = { status: 'loading' };

const PATH_SEPARATOR = '\n';

/**
 * Every level of a map's plate at once, in the order given. The plate is drawn only when all of them
 * are in — a floor that arrived without the other would be a plate with half its map missing — and
 * a single image that fails fails the lot.
 */
export function useRadarImages(assetPaths: readonly string[]): RadarImagesState {
  const [state, setState] = useState<RadarImagesState>(IMAGES_LOADING);
  const key = assetPaths.join(PATH_SEPARATOR);

  useEffect(() => {
    setState(IMAGES_LOADING);

    const paths = key.split(PATH_SEPARATOR);
    const images = paths.map(() => new Image());
    let isCurrent = true;
    let remaining = paths.length;

    for (const [index, image] of images.entries()) {
      image.addEventListener('load', () => {
        remaining -= 1;
        if (isCurrent && remaining === 0) setState({ status: 'ready', images });
      });
      image.addEventListener('error', () => {
        if (isCurrent) setState({ status: 'failed' });
      });

      image.src = `${import.meta.env.BASE_URL}${paths[index]}`;
    }

    return () => {
      isCurrent = false;
    };
  }, [key]);

  return state;
}
