import { Text } from '@disa/i18n';

/** Dim suffix for a field label: only the title is required, the rest says so. */
export function LineupOptionalMark() {
  return (
    <span className="font-normal normal-case opacity-70">
      {' · '}
      <Text path="library.lineups.form.optional" />
    </span>
  );
}
