import { CATBOX_API_URL } from '../constants';
import { catboxImageUrl } from './catbox-url';

export async function uploadToCatbox(file: File, userhash: string): Promise<string | null> {
  const data = new FormData();
  data.set('reqtype', 'fileupload');
  data.set('userhash', userhash);
  data.set('fileToUpload', file, 'lineup.webp');
  try {
    const response = await fetch(CATBOX_API_URL, {
      method: 'POST',
      body: data,
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    return catboxImageUrl(await response.text());
  } catch {
    return null;
  }
}
