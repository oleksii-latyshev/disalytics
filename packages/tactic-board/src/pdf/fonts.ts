import regularUrl from './fonts/Onest-Regular.ttf?url';
import semiboldUrl from './fonts/Onest-SemiBold.ttf?url';
import type { PdfFonts } from './write';

async function fetchBytes(url: string): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The PDF font ${url} did not load (${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

/** The two Onest weights the PDF is set in, fetched only now — they are not part of any screen. */
export async function loadPdfFonts(): Promise<PdfFonts> {
  const [regular, semibold] = await Promise.all([fetchBytes(regularUrl), fetchBytes(semiboldUrl)]);
  return { regular, semibold };
}
