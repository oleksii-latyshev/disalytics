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
