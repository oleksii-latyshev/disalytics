export interface UploadEnv {
  CATBOX_USERHASH?: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_SITE_KEY?: string;
  UPLOAD_RATE_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}

export interface ConfiguredUploadEnv {
  CATBOX_USERHASH: string;
  TURNSTILE_SECRET: string;
  TURNSTILE_SITE_KEY: string;
  UPLOAD_RATE_LIMITER: NonNullable<UploadEnv['UPLOAD_RATE_LIMITER']>;
}

export function configuredUploadEnv(env: UploadEnv): ConfiguredUploadEnv | null {
  const { CATBOX_USERHASH, TURNSTILE_SECRET, TURNSTILE_SITE_KEY, UPLOAD_RATE_LIMITER } = env;
  if (!CATBOX_USERHASH || !TURNSTILE_SECRET || !TURNSTILE_SITE_KEY || !UPLOAD_RATE_LIMITER) {
    return null;
  }
  return { CATBOX_USERHASH, TURNSTILE_SECRET, TURNSTILE_SITE_KEY, UPLOAD_RATE_LIMITER };
}
