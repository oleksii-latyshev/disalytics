# Walkable grids

A route drawn as points should go around walls, not through them. For that every map has a
**walkable grid**, and `findNavPath` in `packages/map-data` turns two points into a corner-hugging
polyline over it.

**The grid is a named approximation.** It is traced from the vanilla radar picture — whatever the
image draws opaque is floor, the rest is wall or void — not read from Valve's nav meshes. It does
not know boxes drawn inside the floor, drop-downs, jumps, boosts, doors that open or close, or which
side of a ledge is climbable. Anything that presents a route says so.

## Pipeline

```
assets/radar/vanilla/*.png → tools/scripts/navgrid/trace.ts → src/generated/navgrids/<map>.ts
                                   ↑ src/navgrid-overrides.ts
```

`bun run navgrid:generate` writes one module per map, one grid per level of
`MapOverview.levels` (Nuke has two; floors are never joined). Output is byte-stable.
`DISALYTICS_NAVGRID_DEBUG=<dir>` also writes each mask over its radar for looking at.

- **Cells** are 4 radar px (256 x 256 over the 1024 px image), one bit each, base64. At 8 px a
  narrow doorway lost its cells and split Anubis, Overpass and Nuke's lower floor.
- **Walls grow by 2 px** before cells are sampled, so a route keeps off them; a cell is walkable when
  half of it survives.
- **Specks are dropped**: only the largest component, any holding a spawn (`spawns.ts`) and any at
  least 2% of the largest are kept.
- **Overrides** (`navgrid-overrides.ts`) open or close rectangles, in radar px, after the trace and
  before the speck filter. Each entry says why. Change one and regenerate.

## Reading it

`loadMapNavGrid(map)` imports that map's module on demand — a separate chunk, never the shell.
`findNavPath(level, from, to)` works in radar px on one level; `findPlatePath` in plate px and
`findWorldPath` in world units wrap it. Each snaps both ends to the nearest walkable cell, runs 8-connected A*
without cutting a blocked corner, then string-pulls the cells by line of sight. Two ends with no
ground between them, or on different floors, come back as a straight segment with
`reachable: false`. Results are memoised per level and shared: do not mutate them.
