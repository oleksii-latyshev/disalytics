function suffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

/** An id for a lineup the user made by hand, which no demo or file can collide with. */
export function newLineupId(): string {
  return `custom-${Date.now()}-${suffix()}`;
}

export function newGroupId(): string {
  return `group-${Date.now()}-${suffix()}`;
}
