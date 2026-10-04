import { useEffect, useState } from 'react';
import { useSetting } from '@/core/settings';
import { prefersLessMotion } from '../helpers/less-motion';

/** Whether the reader has asked for less movement, by setting or by device, kept current. */
export function useLessMotion(): boolean {
  const [motion] = useSetting('motion');
  const [isLess, setIsLess] = useState(() => prefersLessMotion(motion));

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setIsLess(prefersLessMotion(motion));
    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, [motion]);

  return isLess;
}
