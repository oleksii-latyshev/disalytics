import { useEffect } from 'react';

/**
 * Hands `onFile` the demo the operating system opened the installed app with — AGENTS.md §12. With
 * `launch_handler: focus-existing` a second launch arrives in the same window and replaces whatever
 * is open, the way a second drop does. Only the first file of a launch opens: the product shows one
 * match at a time.
 */
export function useLaunchedFiles(onFile: (file: File) => void): void {
  useEffect(() => {
    window.launchQueue?.setConsumer(({ files }) => {
      const [handle] = files;
      if (handle instanceof FileSystemFileHandle) void handle.getFile().then(onFile);
    });
  }, [onFile]);
}
