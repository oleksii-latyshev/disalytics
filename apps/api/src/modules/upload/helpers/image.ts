import { MAX_IMAGE_BYTES } from '../constants';

export async function validWebp(file: File): Promise<boolean> {
  if (file.type !== 'image/webp' || file.size === 0 || file.size > MAX_IMAGE_BYTES) return false;
  const header = new TextDecoder().decode(await file.slice(0, 12).arrayBuffer());
  return header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP';
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
