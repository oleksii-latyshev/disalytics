import type { LocaleResources, MessageTree } from '../config';

function collectInto(target: Record<string, string>, prefix: string, tree: MessageTree): void {
  for (const [segment, value] of Object.entries(tree)) {
    const path = `${prefix}.${segment}`;
    if (typeof value === 'string') {
      target[path] = value;
      continue;
    }
    collectInto(target, path, value);
  }
}

export function flattenResources(resources: LocaleResources): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [namespace, tree] of Object.entries(resources)) {
    collectInto(flat, namespace, tree);
  }
  return flat;
}
