const MAX_SIDE_PX = 1600;
const WEBP_QUALITY = 0.8;

export async function prepareLineupImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('Canvas 2D unavailable');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (output) => {
          if (output === null || output.type !== 'image/webp') {
            reject(new Error('WebP encoding unavailable'));
          } else {
            resolve(output);
          }
        },
        'image/webp',
        WEBP_QUALITY,
      );
    });
    const stem = file.name.replace(/\.[^.]+$/, '') || 'lineup';
    return new File([blob], `${stem}.webp`, { type: 'image/webp' });
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
  form.remove();
}
