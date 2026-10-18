import { MAX_TELEGRAM_URL_LENGTH, parseTelegramLink } from '@disa/admin-contract';
import { Text, useT } from '@disa/i18n';
import { Input } from '@disa/ui';
import { useId } from 'react';

/** Whether `value` may be sent: blank means "none", anything else must name a Telegram channel or user. */
export function isTelegramInputValid(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || parseTelegramLink(trimmed) !== null;
}

/** The link to send for what was typed: `null` for blank, the normalised link otherwise. */
export function telegramLinkOf(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : parseTelegramLink(trimmed);
}

/** The optional Telegram channel, taken as `@name` or a `t.me` link and checked as it is typed. */
export function TelegramField({
  value,
  onChange,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  const t = useT();
  const id = useId();
  const isInvalid = !isTelegramInputValid(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium text-14 text-ink">
        <Text path="admin.telegram.label" />{' '}
        <span className="font-normal text-ink-faint">
          (<Text path="admin.telegram.optional" />)
        </span>
      </label>
      <Input
        id={id}
        value={value}
        maxLength={MAX_TELEGRAM_URL_LENGTH}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={isInvalid}
        placeholder={t('admin.telegram.placeholder')}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <span className={isInvalid ? 'text-12 text-ink' : 'text-12 text-ink-faint'}>
        <Text path={isInvalid ? 'admin.telegram.invalid' : 'admin.telegram.hint'} />
      </span>
    </div>
  );
}
