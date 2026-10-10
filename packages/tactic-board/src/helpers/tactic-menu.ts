export interface MenuBox {
  readonly width: number;
  readonly height: number;
}

/** Where a menu opened at a point goes in a box: at the point, or flipped to the other side of it where it would not fit. */
export function placeMenu(
  point: { readonly x: number; readonly y: number },
  box: MenuBox,
  menu: MenuBox,
): { readonly left: number; readonly top: number } {
  const fitsRight = point.x + menu.width <= box.width;
  const fitsBelow = point.y + menu.height <= box.height;
  const left = fitsRight ? point.x : point.x - menu.width;
  const top = fitsBelow ? point.y : point.y - menu.height;
  return { left: Math.max(0, left), top: Math.max(0, top) };
}
