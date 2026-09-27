import { SITE_HOST, TURNSTILE_VERIFY_URL } from '../constants';

export async function validChallenge(
  value: FormDataEntryValue | null,
  secret: string,
): Promise<boolean> {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false;
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: new URLSearchParams({ secret, response: value }),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    return (
      typeof result === 'object' &&
      result !== null &&
      'success' in result &&
      result.success === true &&
      'hostname' in result &&
      (result.hostname === SITE_HOST ||
        result.hostname === 'localhost' ||
        result.hostname === '127.0.0.1')
    );
  } catch {
    return false;
  }
}
