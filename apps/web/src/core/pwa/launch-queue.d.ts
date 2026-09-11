// The File Handling API is Chromium's alone, and TypeScript's DOM library does not declare it.

interface LaunchParams {
  readonly files: readonly FileSystemHandle[];
}

interface LaunchQueue {
  setConsumer(consumer: (params: LaunchParams) => void): void;
}

interface Window {
  readonly launchQueue?: LaunchQueue;
}
