# Walkable grids

A route drawn as points should go around walls, not through them. For that every map has a
**walkable grid**, and `findNavPath` in `packages/map-data` turns two points into a corner-hugging
polyline over it.

**The grid is a named approximation.** It is traced from the vanilla radar picture — whatever the
image draws opaque is floor, the rest is wall or void — not read from Valve's nav meshes. It does
not know boxes drawn inside the floor, drop-downs, jumps, boosts, doors that open or close, or which
side of a ledge is climbable. Where floors join is read from where real players changed floor, not
drawn. Anything that presents a route says so.

## Floors

A **floor** is one piece of ground a route can be on, and `mapFloors(overview)` lists them: the
overview's levels first (Nuke: `upper`, `lower`), then authored **extra floors** (`EXTRA_FLOORS` in
`floors.ts`). An extra floor is for ground the radar draws over the same pixels as the floor above it
with no level of its own — Mirage's `underpass`, the L under Mid. It is the part of a radar-pixel
`region` below a `belowZ`; the entry says why, and the figures come from real tracks. Low ground
outside the region is just the main floor. Every floor is drawn on one level's image, so a plate
shows one floor at a time over the same 1024 px.

`floorAt(overview, x, y, z)` gives the floor of a world point; a point with no `z` is on floor 0,
which is how a tactic saved before floors existed reads. `floorRefZ` is the altitude a point made on
a floor is given, so the floor survives in the tactic's optional `TacticPoint.z`.

## Pipeline

```
containers (DISALYTICS_FLOOR_DIR) → tools/scripts/floors-generate.ts → src/generated/floors.ts
assets/radar/vanilla/*.png ─┐                                                   │
src/navgrid-overrides.ts ───┴→ tools/scripts/navgrid/trace.ts → navgrid-generate.ts → src/generated/navgrids/<map>.ts
```

`bun run floors:generate` reads parsed containers (the shipped samples, plus `.disa` / `.disa.gz` in
`DISALYTICS_FLOOR_DIR`; parse a demo with the app first) of maps with more than one floor. A map no
container names keeps the committed data; one that does is recomputed from all of its containers.
Output is byte-stable. It writes per map:

- **Connectors**: steps of one player between consecutive 16 Hz frames, alive both, under 80 world
  units apart, that end on another floor. Crossings are clustered by floor pair within 20 radar px;
  a cluster seen fewer than 3 times, or less than a tenth as often as the map's busiest, is
  dropped (a flicker over the altitude split inside a corridor makes a handful of crossings against
  dozens at its stairs). Each end is the mean of where players stood on that floor; a cluster only
  ever crossed one way is **one-way** (a drop), usable from `a` to `b` only.
- For an extra floor, **masks**: the cells its tracks cover (`own`) and the cells the shared floor's
  tracks cover inside the same region (`shared`), each grown by two cells and pulled back by one so
  the gaps between samples close.

`bun run navgrid:generate` writes one module per map, one grid per floor, then the connectors,
snapped onto walkable cells. Output is byte-stable. `DISALYTICS_NAVGRID_DEBUG=<dir>` also writes each
mask over its radar for looking at.

- **Cells** are 4 radar px (256 x 256 over the 1024 px image), one bit each, base64. At 8 px a
  narrow doorway lost its cells and split Anubis, Overpass and Nuke's lower floor.
- **Walls grow by 2 px** before cells are sampled, so a route keeps off them; a cell is walkable when
  half of it survives.
- **An extra floor's grid is its `own` mask as it is**, not cut to the radar's opaque ground: the
  underpass runs through places the picture leaves blank. The cells only it covered (`own` minus
  `shared`, the latter grown by two cells) are **cut out of the floor it shares pixels with**, so a
  route on the main floor cannot shortcut through the corridor.
- **Specks are dropped**: only the largest component, any holding a spawn (`spawns.ts`) and any at
  least 2% of the largest are kept.
- **Overrides** (`navgrid-overrides.ts`) open or close rectangles, in radar px, after the trace and
  before the speck filter. Each entry says why. Change one and regenerate.

## Reading it

`loadMapNavGrid(map)` imports that map's module on demand — a separate chunk, never the shell — and
gives `levels` (one per floor, `mapFloors` order) and `connectors`.
`findNavPath(level, from, to)` works in radar px on one floor: it snaps both ends to the nearest
walkable cell, runs 8-connected A* without cutting a blocked corner, then string-pulls the cells by
line of sight. Results are memoised per level and shared: do not mutate them.

`findFloorPath(grid, from, to)` is the one that crosses floors. Each end is a `FloorPoint` (radar px
plus floor). It runs Dijkstra over the two ends and every connector end, with a `findNavPath` leg
between nodes on the same floor and `CONNECTOR_COST_PX` (24 px) on top of the span for each
connector taken; the result's points each carry their floor, and two neighbours on different floors
are a connector. On one floor, with no connector able to beat the walk, it is exactly
`findNavPath`. Ends with no way between them, or on a floor with no ground, come back as a straight
segment with `reachable: false`. `findPlatePath` (plate px) and `findWorldPath` (world units, floors
from `z`) wrap it.

The tactic board walks every route through it (`helpers/tactic-route.ts`): a waypoint's floor is its
`z`, a leg's time counts each connector's cost as length, and the plate shows one floor at a time with
the other floor's marks faded and a small up/down mark where a route changes floor.
