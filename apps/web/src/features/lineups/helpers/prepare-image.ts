const MAX_SIDE_PX = 1600;
const WEBP_QUALITY = 0.8;
/** Radius of the untouched circle around the crosshair at 1080p; scales with taller shots. */
const AIM_RADIUS_PX = 50;

/**
 * Keeps the original resolution so the crosshair circle stays pixel-exact, and paints everything
 * outside it from a copy downscaled to `MAX_SIDE_PX`: the smooth background compresses below what
 * the downscaled image alone used to cost.
 */
export async function prepareLineupImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width: w, height: h } = bitmap;
    const ratio = Math.min(1, MAX_SIDE_PX / Math.max(w, h));

    const canvas = new OffscreenCanvas(w, h);
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas 2D unavailable');
    if (ratio < 1) {
      const small = new OffscreenCanvas(
        Math.max(1, Math.round(w * ratio)),
        Math.max(1, Math.round(h * ratio)),
      );
      small.getContext('2d')?.drawImage(bitmap, 0, 0, small.width, small.height);
      context.drawImage(small, 0, 0, w, h);
      context.beginPath();
      context.arc(w / 2, h / 2, AIM_RADIUS_PX * Math.max(1, h / 1080), 0, Math.PI * 2);
      context.clip();
    }
    context.drawImage(bitmap, 0, 0);

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
