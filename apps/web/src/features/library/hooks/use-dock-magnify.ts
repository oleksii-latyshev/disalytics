import { useEffect, useRef } from 'react';
import { useSetting } from '@/core/settings';
import { prefersLessMotion } from '../helpers/less-motion';

/** How far either side of an entry's centre the pointer still lifts it, in CSS pixels. */
const REACH_PX = 110;

/** What the entry under the pointer grows to. */
const MAGNIFY = 1.25;

/**
 * The dock's magnification: the entry nearest the pointer grows, its neighbours less so, and the
 * fall-off is squared so the lift is local rather than a whole row swelling at once.
 *
 * Four things are load-bearing.
 *
 * **It writes `scale` and never a size.** Upstream's dock animates each item's `width` and `height`
 * and the panel's height with them, so every pointer move relays out a row of six and the ground
 * under it; a transform is composited and the layout the panel reserves is the resting one. That is
 * also what lets the mark for the current entry sit in the same box: the entry's *layout* box never
 * moves, so the bar underneath it stays exactly under the glyph however far it has grown.
 *
 * **It is mouse only** (`pointerType`), which is how touch degrades to nothing rather than to a
 * stuck scale: a tap sets no scale at all, so there is none left behind when the finger goes.
 *
 * **The centres are measured once per pointer entry**, not per move. Reading a rect after writing a
 * style forces a synchronous layout, and doing that inside the loop is six of them per move; the
 * entries do not move while the pointer is inside the dock, so one pass on the way in is enough.
 *
 * **Nothing here is where you are.** The current entry is stated by `aria-current`, by the ink step
 * and by the bar the dock slides under it — §17 rule 9, because a magnifying dock is a pointer
 * affordance and this product is reachable without a pointer. Under reduced motion the listeners
 * are never attached and the dock is a plain row of controls.
 */
export function useDockMagnify() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [motion] = useSetting('motion');

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || prefersLessMotion(motion)) return;

    const items = [...panel.querySelectorAll<HTMLElement>('[data-dock-item]')];
    let placed: { item: HTMLElement; centre: number }[] = [];

    const rest = () => {
      for (const item of items) item.style.removeProperty('scale');
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      if (placed.length !== items.length) {
        placed = items.map((item) => {
          const rect = item.getBoundingClientRect();

          return { item, centre: rect.left + rect.width / 2 };
        });
      }

      for (const { item, centre } of placed) {
        const nearness = Math.max(0, 1 - Math.abs(event.clientX - centre) / REACH_PX);
        item.style.scale = String(1 + nearness * nearness * (MAGNIFY - 1));
      }
    };

    const leave = () => {
      placed = [];
      rest();
    };

    // The dock is centred on the viewport, so a resize moves every centre under a pointer that has
    // not left. Dropping the cache is the whole fix; the next move measures again.
    const forget = () => {
      placed = [];
    };

    panel.addEventListener('pointermove', move);
    panel.addEventListener('pointerleave', leave);
    window.addEventListener('resize', forget);

    return () => {
      panel.removeEventListener('pointermove', move);
      panel.removeEventListener('pointerleave', leave);
      window.removeEventListener('resize', forget);
      rest();
    };
  }, [motion]);

  return panelRef;
}
