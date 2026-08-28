/// <reference types="vite/client" />

// User-Agent Client Hints. TypeScript's DOM library does not declare it, and the alternative is a
// cast at the one call site that reads it — https://wicg.github.io/ua-client-hints/
interface NavigatorUAData {
  readonly platform: string;
}

interface Navigator {
  readonly userAgentData?: NavigatorUAData;
}
