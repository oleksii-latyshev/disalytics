import { readFileSync } from 'node:fs';
import type { Translate } from '@disa/i18n';
import { describe, expect, it } from 'vitest';
import { buildPdfContent } from '../content';
import { cropImageId, layoutPdf, plateImageId, type Rgb } from '../layout';
import { createTextMeasure, type PdfFonts, type PdfImage, writePdf } from '../write';
import { keyTranslate, sampleTactic, schedulesFor } from './pdf-fixture';

const read = (name: string) =>
  new Uint8Array(readFileSync(new URL(`../fonts/${name}`, import.meta.url)));
const FONTS: PdfFonts = {
  regular: read('Onest-Regular.ttf'),
  semibold: read('Onest-SemiBold.ttf'),
};
const COLORS: readonly Rgb[] = [
  [200, 40, 40],
  [40, 200, 40],
  [40, 40, 200],
  [240, 240, 40],
  [40, 240, 240],
];
const PIXEL: PdfImage = {
  dataUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  format: 'PNG',
};

function render(title: string) {
  const { tactic } = sampleTactic();
  const t = keyTranslate as Translate;
  const content = buildPdfContent({
    tactic: { ...tactic, title },
    t,
    lineups: [],
    schedules: schedulesFor(tactic),
  });
  const images = new Map<string, PdfImage>();
  for (const section of content.sections) {
    images.set(plateImageId(section.key), PIXEL);
    for (const entry of section.throws) images.set(cropImageId(section.key, entry.id), PIXEL);
  }
  const measure = createTextMeasure(FONTS);
  const pages = layoutPdf(content, {
    measure,
    slotColors: COLORS,
    hasImage: (id) => images.has(id),
  });
  return { pages, bytes: new Uint8Array(writePdf(pages, images, FONTS, content.title)) };
}

const asText = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

describe('writePdf', () => {
  it('writes a PDF with a page for every laid-out page, Cyrillic title included', () => {
    const { pages, bytes } = render('Мид и сплит');
    const text = asText(bytes);
    expect(text.startsWith('%PDF-')).toBe(true);
    expect(text.match(/\/Type\s*\/Page\b/g)).toHaveLength(pages.length);
  });

  it('measures Cyrillic text in the font it is written in', () => {
    const measure = createTextMeasure(FONTS);
    expect(measure('Привет', 'regular', 10)).toBeGreaterThan(5);
    expect(measure('Привет', 'semibold', 10)).toBeGreaterThan(
      measure('Привет', 'regular', 10) * 0.9,
    );
    expect(measure('', 'regular', 10)).toBe(0);
  });
});
