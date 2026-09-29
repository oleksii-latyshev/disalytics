import { MAX_IMAGE_BYTES } from '../constants';

const ALLOWED_IMAGE_TYPES = new Set(['image/webp', 'image/png']);

/** PNG magic: 8-byte header `\x89PNG\r\n\x1a\n` */
const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function validImage(file: File): Promise<boolean> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type) || file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return false;
  }

  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  if (file.type === 'image/webp') {
    const text = new TextDecoder().decode(header);
    return text.startsWith('RIFF') && text.slice(8, 12) === 'WEBP';
  }

  // PNG
  return PNG_MAGIC.every((byte, i) => header[i] === byte);
}

export function expectedUploadFields(form: FormData): boolean {
  let unexpectedField = false;
  form.forEach((_value, key) => {
    if (key !== 'image' && key !== 'turnstile') unexpectedField = true;
  });
  return (
    !unexpectedField && form.getAll('image').length === 1 && form.getAll('turnstile').length === 1
  );
}
