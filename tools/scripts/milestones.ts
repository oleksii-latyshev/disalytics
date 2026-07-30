import { $ } from 'bun';

interface Milestone {
  title: string;
  description: string;
}

const MILESTONES: Milestone[] = [
  { title: 'Phase 0', description: 'Parser validation — a pass/fail test of the Rust default, not an open exploration' },
  { title: 'Phase 1', description: 'Foundation — Bun, Vite, Biome, app skeleton, i18n, design tokens, workflows, deploy' },
  { title: 'Phase 2', description: 'Parsing pipeline — Rust crates, decompression, worker protocol, columnar output, OPFS cache' },
  { title: 'Phase 3', description: 'Radar — map data generation, Canvas 2D renderer, multi-level layers, debug overlay' },
  { title: 'Phase 4', description: 'Playback — rAF clock, interpolation, scrubber, speed control, event markers' },
  { title: 'Phase 5', description: 'Analytics — filters, highlight extraction, sound radius, grenade trajectories' },
  { title: 'Phase 6', description: 'PWA polish — file handlers, install prompt, offline shell, demo library, update flow' },
];

const existingTitles = await $`gh api repos/{owner}/{repo}/milestones?state=all --paginate --jq .[].title`
  .text()
  .then((output) => new Set(output.split('\n').map((line) => line.trim()).filter(Boolean)));

let createdCount = 0;
for (const { title, description } of MILESTONES) {
  if (existingTitles.has(title)) continue;
  await $`gh api repos/{owner}/{repo}/milestones -f title=${title} -f description=${description}`.quiet();
  createdCount++;
}

console.log(`${createdCount} milestones created, ${MILESTONES.length - createdCount} already present`);
