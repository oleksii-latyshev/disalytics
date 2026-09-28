import { useEffect, useState } from 'react';

function isDemoFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.dem') ||
    name.endsWith('.dem.zst') ||
    name.endsWith('.dem.bz2') ||
    name.endsWith('.zst') ||
    name.endsWith('.bz2')
  );
}

function isModalOpen(): boolean {
  return document.querySelector('[data-shortcuts-suspended]') !== null;
}

// The listeners sit on the window rather than on the drop zone because a drop the page does not
// take responsibility for navigates away to the file — which, with a demo, means leaving the app.
export function useFileDrop(onFile: (file: File) => void): boolean {
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  useEffect(() => {
    const allow = (event: DragEvent) => {
      if (event.defaultPrevented || isModalOpen()) return;
      event.preventDefault();
      setIsDraggedOver(true);
    };

    // A dragleave with no element behind it is the pointer leaving the window entirely; the ones
    // fired while crossing between children are not the drag ending.
    const withdraw = (event: DragEvent) => {
      if (event.relatedTarget === null) setIsDraggedOver(false);
    };

    const abandon = () => setIsDraggedOver(false);

    const accept = (event: DragEvent) => {
      if (event.defaultPrevented || isModalOpen()) {
        setIsDraggedOver(false);
        return;
      }
      event.preventDefault();
      setIsDraggedOver(false);

      const dropped = event.dataTransfer?.files.item(0);
      if (dropped && isDemoFile(dropped)) onFile(dropped);
    };

    window.addEventListener('dragover', allow);
    window.addEventListener('dragleave', withdraw);
    window.addEventListener('dragend', abandon);
    window.addEventListener('drop', accept);

    return () => {
      window.removeEventListener('dragover', allow);
      window.removeEventListener('dragleave', withdraw);
      window.removeEventListener('dragend', abandon);
      window.removeEventListener('drop', accept);
    };
  }, [onFile]);

  return isDraggedOver;
}
