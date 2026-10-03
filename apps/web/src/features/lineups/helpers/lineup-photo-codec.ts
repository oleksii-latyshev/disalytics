import { localImageRef } from '@disa/demo-core';

const DATA_URL = /^data:(image\/(?:webp|png));base64,(.*)$/s;
const CHUNK = 0x8000;

export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hashedLocalRef(blob: Blob): Promise<{ hash: string; ref: string }> {
  const hash = await sha256Hex(blob);
  return { hash, ref: localImageRef(hash) };
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let at = 0; at < bytes.length; at += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(at, at + CHUNK));
  }
  const type = blob.type === 'image/png' ? 'image/png' : 'image/webp';
  return `data:${type};base64,${btoa(binary)}`;
}

/** `null` when the string is not a base64 webp/png data URL. */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = DATA_URL.exec(dataUrl);
  const type = match?.[1];
  const payload = match?.[2];
  if (type === undefined || payload === undefined) return null;

  let binary: string;
  try {
    binary = atob(payload);
  } catch {
    return null;
  }
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at += 1) bytes[at] = binary.charCodeAt(at);
  return new Blob([bytes], { type });
}
