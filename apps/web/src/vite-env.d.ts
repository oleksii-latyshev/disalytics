/// <reference types="vite/client" />

// User-Agent Client Hints. TypeScript's DOM library does not declare it, and the alternative is a
// cast at the one call site that reads it — https://wicg.github.io/ua-client-hints/
interface NavigatorUAData {
  readonly platform: string;
}

interface Navigator {
  readonly userAgentData?: NavigatorUAData;
}

interface ImportMetaEnv {
  /** Base URL of the metadata API; the production Worker when unset. */
  readonly VITE_DISALYTICS_API_URL?: string;
  /** Where the lineups admin is; the production Worker when unset. */
  readonly VITE_DISALYTICS_ADMIN_URL?: string;
}
