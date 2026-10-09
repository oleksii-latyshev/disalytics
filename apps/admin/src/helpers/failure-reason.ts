import type { TranslationKey } from '@disa/i18n';

const KEYS: Readonly<Record<string, TranslationKey>> = {
  not_https: 'admin.linkFailure.notHttps',
  invalid_url: 'admin.linkFailure.invalidUrl',
  bad_redirect: 'admin.linkFailure.badRedirect',
  too_many_redirects: 'admin.linkFailure.tooManyRedirects',
  timeout: 'admin.linkFailure.timeout',
  network: 'admin.linkFailure.network',
  too_large: 'admin.linkFailure.tooLarge',
  not_an_image: 'admin.linkFailure.notAnImage',
  missing: 'admin.linkFailure.missing',
  not_a_data_url: 'admin.linkFailure.notAnImage',
  bad_base64: 'admin.linkFailure.notAnImage',
};

const HTTP_STATUS = /^http_(\d{3})$/;

/** The words for why a photo could not be stored; the server sends a code, never prose. */
export function failureReason(reason: string): { key: TranslationKey; status?: number } {
  const status = HTTP_STATUS.exec(reason)?.[1];
  if (status !== undefined) return { key: 'admin.linkFailure.httpStatus', status: Number(status) };
  return { key: KEYS[reason] ?? 'admin.linkFailure.other' };
}
