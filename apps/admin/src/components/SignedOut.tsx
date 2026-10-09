import { Text } from '@disa/i18n';
import { Muted, Section } from './Section';

export function SignedOut() {
  return (
    <Section title={<Text path="admin.signedOut.title" />}>
      <Muted>
        <Text path="admin.signedOut.body" />
      </Muted>
      <p className="text-12 text-ink-faint">
        <Text path="admin.signedOut.owner" />
      </p>
    </Section>
  );
}
