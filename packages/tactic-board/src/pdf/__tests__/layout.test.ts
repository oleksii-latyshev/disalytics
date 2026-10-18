import type { Translate } from '@disa/i18n';
import { describe, expect, it } from 'vitest';
import { buildPdfContent, type PdfContent, type PdfStepSection } from '../content';
import {
  cropImageId,
  type DrawCommand,
  layoutPdf,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  type PdfPage,
  plateImageId,
  type Rgb,
} from '../layout';
import { fakeMeasure, keyTranslate, sampleTactic, schedulesFor } from './pdf-fixture';

const t = keyTranslate as Translate;
const COLORS: readonly Rgb[] = [
  [200, 40, 40],
  [40, 200, 40],
  [40, 40, 200],
  [240, 240, 40],
  [40, 240, 240],
];

function build(): PdfContent {
  const { tactic } = sampleTactic();
  return buildPdfContent({ tactic, t, lineups: [], schedules: schedulesFor(tactic) });
}

function lay(content: PdfContent, hasImage: (id: string) => boolean = () => true) {
  return layoutPdf(content, { measure: fakeMeasure, slotColors: COLORS, hasImage });
}

const textsOf = (page: PdfPage) =>
  page.commands.flatMap((command) => (command.kind === 'text' ? [command.text] : []));
const imagesOf = (page: PdfPage) =>
  page.commands.flatMap((command) => (command.kind === 'image' ? [command.id] : []));

function withSection(content: PdfContent, patch: Partial<PdfStepSection>): PdfContent {
  const [first, ...rest] = content.sections;
  if (first === undefined) throw new Error('fixture has no section');
  return { ...content, sections: [{ ...first, ...patch }, ...rest] };
}

describe('layoutPdf pages', () => {
  it('opens with the cover and starts every step on a page of its own', () => {
    const content = build();
    const pages = lay(content);
    expect(textsOf(pages[0] as PdfPage)).toContain('Mid split');
    let from = 1;
    for (const section of content.sections) {
      const at = pages.findIndex(
        (page, index) => index >= from && textsOf(page).includes(section.title),
      );
      expect(at).toBeGreaterThanOrEqual(from);
      from = at + 1;
    }
  });

  it('puts the tactic and the page number in every footer', () => {
    const content = build();
    const pages = lay(content);
    pages.forEach((page, index) => {
      const texts = textsOf(page);
      expect(texts).toContain(`library.tactics.pdf.page(page=${index + 1},total=${pages.length})`);
      expect(texts).toContain('Mid split');
    });
  });

  it('draws each step plate and the close-up of its throw when the pictures exist', () => {
    const content = build();
    const pages = lay(content);
    const section = content.sections[0] as PdfStepSection;
    const thrown = section.throws[0];
    const ids = pages.flatMap(imagesOf);
    expect(ids).toContain(plateImageId(section.key));
    expect(ids).toContain(cropImageId(section.key, thrown?.id ?? ''));
    expect(ids.indexOf(plateImageId(section.key))).toBeLessThan(
      ids.indexOf(cropImageId(section.key, thrown?.id ?? '')),
    );
  });

  it('leaves the pictures out, and the pages in, when none could be made', () => {
    const content = build();
    const pages = lay(content, () => false);
    expect(pages.length).toBeGreaterThanOrEqual(1 + content.sections.length);
    expect(pages.flatMap(imagesOf)).toEqual([]);
  });

  it('keeps everything on the sheet', () => {
    const pages = lay(build());
    const bound = (command: DrawCommand): number[] => {
      switch (command.kind) {
        case 'line':
          return [command.x1, command.y1, command.x2, command.y2];
        case 'text':
        case 'circle':
          return [command.x, command.y];
        default:
          return [command.x, command.y, command.x + command.w, command.y + command.h];
      }
    };
    for (const page of pages) {
      for (const command of page.commands) {
        const [x = 0, y = 0, x2 = x, y2 = y] = bound(command);
        expect(Math.min(x, x2)).toBeGreaterThanOrEqual(0);
        expect(Math.max(x, x2)).toBeLessThanOrEqual(PAGE_WIDTH);
        expect(Math.min(y, y2)).toBeGreaterThanOrEqual(0);
        expect(Math.max(y, y2)).toBeLessThanOrEqual(PAGE_HEIGHT);
      }
    }
  });
});

describe('layoutPdf long text', () => {
  it('runs a step onto another page and says whose it is', () => {
    const content = withSection(build(), {
      idea: Array.from({ length: 160 }, (_, line) => `Line ${line} of a very long idea`).join('\n'),
    });
    const pages = lay(content);
    const eyebrow = content.sections[0]?.eyebrow ?? '';
    const first = pages.findIndex((page) => textsOf(page).includes(eyebrow));
    expect(textsOf(pages[first + 1] as PdfPage)).toContain(
      'library.tactics.pdf.continued(title=Take mid)',
    );
  });

  it('cuts a word that cannot fit instead of running past the margin', () => {
    const content = withSection(build(), { idea: 'x'.repeat(2000) });
    const pages = lay(content);
    const widest = Math.max(
      ...pages.flatMap((page) => textsOf(page).map((text) => fakeMeasure(text, 'regular', 10))),
    );
    expect(widest).toBeLessThanOrEqual(PAGE_WIDTH - 32 + 0.001);
  });

  it('skips the blocks a step has nothing for', () => {
    const content = withSection(build(), { idea: null, players: [], throws: [], enemies: [] });
    const texts = textsOf(lay(content)[1] as PdfPage);
    expect(texts).not.toContain(content.headings.idea);
    expect(texts).not.toContain(content.headings.tasks);
    expect(texts).not.toContain(content.headings.enemies);
  });
});
