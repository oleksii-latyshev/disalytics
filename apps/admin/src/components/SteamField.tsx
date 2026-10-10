import { isSteamUrl, MAX_STEAM_URL_LENGTH } from '@disa/admin-contract';
import { Text, useT } from '@disa/i18n';
import { Input } from '@disa/ui';
import { useId } from 'react';

/** Whether `value` may be sent: blank means "none", anything else must be a Steam profile link. */
export function isSteamInputValid(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || isSteamUrl(trimmed);
}

/** The optional Steam profile link, checked as it is typed with the rule the Worker applies. */
export function SteamField({
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
  const isInvalid = !isSteamInputValid(value);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium text-14 text-ink">
        <Text path="admin.steam.label" />{' '}
        <span className="font-normal text-ink-faint">
          (<Text path="admin.steam.optional" />)
        </span>
      </label>
      <Input
        id={id}
        type="url"
        value={value}
        maxLength={MAX_STEAM_URL_LENGTH}
        autoFocus={autoFocus}
        autoComplete="url"
        aria-invalid={isInvalid}
        placeholder={t('admin.steam.placeholder')}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      <span className={isInvalid ? 'text-12 text-ink' : 'text-12 text-ink-faint'}>
        <Text path={isInvalid ? 'admin.steam.invalid' : 'admin.steam.hint'} />
      </span>
    </div>
  );
}
