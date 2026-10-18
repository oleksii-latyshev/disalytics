import { jsPDF } from 'jspdf';
import { type DrawCommand, PAGE_HEIGHT, PAGE_WIDTH, type PdfPage } from './layout';
import type { FontId, MeasureText } from './text';

export interface PdfImage {
  readonly dataUrl: string;
  readonly format: 'JPEG' | 'PNG';
}

export interface PdfFonts {
  readonly regular: Uint8Array;
  readonly semibold: Uint8Array;
}

const FAMILY = 'Onest';
const STYLE_OF: Readonly<Record<FontId, 'normal' | 'bold'>> = {
  regular: 'normal',
  semibold: 'bold',
};
const BASE64_CHUNK = 0x4000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let at = 0; at < bytes.length; at += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(at, at + BASE64_CHUNK));
  }
  return btoa(binary);
}

function newDocument(fonts: PdfFonts, title: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  doc.addFileToVFS('Onest-Regular.ttf', toBase64(fonts.regular));
  doc.addFont('Onest-Regular.ttf', FAMILY, STYLE_OF.regular);
  doc.addFileToVFS('Onest-SemiBold.ttf', toBase64(fonts.semibold));
  doc.addFont('Onest-SemiBold.ttf', FAMILY, STYLE_OF.semibold);
  doc.setProperties({ title, creator: 'disalytics' });
  return doc;
}

/** Text width in millimetres, in the same fonts the document is written with. */
export function createTextMeasure(fonts: PdfFonts): MeasureText {
  const doc = newDocument(fonts, '');
  return (text, font, size) => {
    doc.setFont(FAMILY, STYLE_OF[font]);
    doc.setFontSize(size);
    return doc.getTextWidth(text);
  };
}

function draw(doc: jsPDF, command: DrawCommand, images: ReadonlyMap<string, PdfImage>): void {
  switch (command.kind) {
    case 'text':
      doc.setFont(FAMILY, STYLE_OF[command.font]);
      doc.setFontSize(command.size);
      doc.setTextColor(...command.color);
      doc.text(command.text, command.x, command.y, {
        align: command.align,
        charSpace: command.charSpace,
      });
      return;
    case 'line':
      doc.setDrawColor(...command.color);
      doc.setLineWidth(command.width);
      doc.line(command.x1, command.y1, command.x2, command.y2);
      return;
    case 'rect':
      doc.setDrawColor(...command.stroke);
      doc.setLineWidth(command.width);
      doc.rect(command.x, command.y, command.w, command.h, 'S');
      return;
    case 'circle':
      doc.setFillColor(...command.fill);
      doc.circle(command.x, command.y, command.r, 'F');
      return;
    case 'image': {
      const image = images.get(command.id);
      if (image === undefined) return;
      doc.addImage(
        image.dataUrl,
        image.format,
        command.x,
        command.y,
        command.w,
        command.h,
        command.id,
        'NONE',
      );
      return;
    }
  }
}

/** Writes laid-out pages to a PDF file's bytes. */
export function writePdf(
  pages: readonly PdfPage[],
  images: ReadonlyMap<string, PdfImage>,
  fonts: PdfFonts,
  title: string,
): ArrayBuffer {
  const doc = newDocument(fonts, title);
  pages.forEach((page, index) => {
    if (index > 0) doc.addPage([PAGE_WIDTH, PAGE_HEIGHT], 'portrait');
    for (const command of page.commands) draw(doc, command, images);
  });
  return doc.output('arraybuffer');
}
