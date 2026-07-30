import { $ } from 'bun';

interface Label {
  name: string;
  color: string;
  description: string;
}

const AREA_COLOR = 'BFD4F2';
const PHASE_COLOR = 'EDEDED';

const TYPE_LABELS: Label[] = [
  { name: 'type:feat', color: '1D76DB', description: 'New capability' },
  { name: 'type:fix', color: 'D73A4A', description: 'Bug fix' },
  { name: 'type:perf', color: 'F59E0B', description: 'Performance work' },
  { name: 'type:refactor', color: '7C8794', description: 'No behaviour change' },
  { name: 'type:chore', color: '586069', description: 'Tooling, deps, config' },
  { name: 'type:docs', color: '0E8A16', description: 'Docs only' },
  { name: 'type:test', color: '5319E7', description: 'Tests only' },
];

const AREA_LABELS: Label[] = [
  { name: 'area:parser', color: AREA_COLOR, description: 'Demo parsing, Rust crates, WASM' },
  { name: 'area:radar', color: AREA_COLOR, description: 'Map rendering, coordinate transforms, map data' },
  { name: 'area:timeline', color: AREA_COLOR, description: 'The match spine: round bands, event density, scrubber' },
  { name: 'area:analytics', color: AREA_COLOR, description: 'Filters, highlight extraction, derived statistics' },
  { name: 'area:ui', color: AREA_COLOR, description: 'Design tokens, shared primitives, layout' },
  { name: 'area:i18n', color: AREA_COLOR, description: 'Locale resources, typed keys, formatting' },
  { name: 'area:pwa', color: AREA_COLOR, description: 'Service worker, manifest, file handlers, offline' },
  { name: 'area:storage', color: AREA_COLOR, description: 'OPFS, IndexedDB, schema versioning' },
  { name: 'area:ci', color: AREA_COLOR, description: 'Workflows, gates, deployment, repository config' },
  { name: 'area:docs', color: AREA_COLOR, description: 'Documentation only' },
];

const PHASE_LABELS: Label[] = [
  { name: 'phase:0', color: PHASE_COLOR, description: 'Parser validation' },
  { name: 'phase:1', color: PHASE_COLOR, description: 'Foundation' },
  { name: 'phase:2', color: PHASE_COLOR, description: 'Parsing pipeline' },
  { name: 'phase:3', color: PHASE_COLOR, description: 'Radar' },
  { name: 'phase:4', color: PHASE_COLOR, description: 'Playback' },
  { name: 'phase:5', color: PHASE_COLOR, description: 'Analytics' },
  { name: 'phase:6', color: PHASE_COLOR, description: 'PWA polish' },
];

const STATUS_LABELS: Label[] = [
  { name: 'blocked', color: 'B60205', description: 'Waiting on another issue or an external dependency' },
  { name: 'needs-decision', color: 'FBCA04', description: 'Requires a human decision — see AGENTS.md §21' },
  { name: 'good-first-issue', color: '7057FF', description: 'Self-contained, good for a first contribution' },
];

const SUPERSEDED_DEFAULT_LABELS = [
  'bug',
  'documentation',
  'duplicate',
  'enhancement',
  'good first issue',
  'help wanted',
  'invalid',
  'question',
  'wontfix',
];

async function upsertLabel({ name, color, description }: Label): Promise<void> {
  await $`gh label create ${name} --color ${color} --description ${description} --force`.quiet();
}

async function removeLabel(name: string): Promise<boolean> {
  const result = await $`gh label delete ${name} --yes`.quiet().nothrow();
  return result.exitCode === 0;
}

const labels = [...TYPE_LABELS, ...AREA_LABELS, ...PHASE_LABELS, ...STATUS_LABELS];

for (const label of labels) {
  await upsertLabel(label);
}

let removedCount = 0;
for (const name of SUPERSEDED_DEFAULT_LABELS) {
  if (await removeLabel(name)) removedCount++;
}

console.log(`${labels.length} labels applied, ${removedCount} superseded defaults removed`);
