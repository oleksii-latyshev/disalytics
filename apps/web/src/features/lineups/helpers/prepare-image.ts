const MAX_SIDE_PX = 1600;
const WEBP_QUALITY = 0.8;

export async function prepareLineupImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * ratio));
    const h = Math.max(1, Math.round(bitmap.height * ratio));

    const canvas = new OffscreenCanvas(w, h);
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas 2D unavailable');
    context.drawImage(bitmap, 0, 0, w, h);

    // OffscreenCanvas.convertToBlob supports WebP on all major browsers.
    // Fall back to PNG when the UA returns a different MIME (should not happen
    // on Chromium or Firefox, but keeps the path safe).
    let blob = await canvas.convertToBlob({ type: 'image/webp', quality: WEBP_QUALITY });
    let ext = 'webp';
    if (blob.type !== 'image/webp') {
      blob = await canvas.convertToBlob({ type: 'image/png' });
      ext = 'png';
    }

    const stem = file.name.replace(/\.[^.]+$/, '') || 'lineup';
    return new File([blob], `${stem}.${ext}`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}

export function submitImageToCatbox(file: File): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://catbox.moe/user/api.php';
  form.enctype = 'multipart/form-data';
  form.target = '_blank';
  // Keep the form offscreen so it does not shift layout.
  form.style.position = 'fixed';
  form.style.left = '-9999px';

  const requestType = document.createElement('input');
  requestType.type = 'hidden';
  requestType.name = 'reqtype';
  requestType.value = 'fileupload';
  form.append(requestType);

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.name = 'fileToUpload';
  const transfer = new DataTransfer();
  transfer.items.add(file);
  fileInput.files = transfer.files;
  form.append(fileInput);

  document.body.append(form);
  form.submit();
  // Defer removal so the browser's navigation/submission has time to start.
  setTimeout(() => form.remove(), 2000);
}
