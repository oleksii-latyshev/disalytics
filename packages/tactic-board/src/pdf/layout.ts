import type {
  PdfContent,
  PdfCover,
  PdfEnemyEntry,
  PdfLoadoutRow,
  PdfPlanOverview,
  PdfPlayerEntry,
  PdfStepSection,
  PdfThrowEntry,
} from './content';
import { type FontId, fitText, type MeasureText, wrapText } from './text';

export type Rgb = readonly [number, number, number];

export type DrawCommand =
  | {
      readonly kind: 'text';
      readonly text: string;
      readonly x: number;
      readonly y: number;
      readonly font: FontId;
      readonly size: number;
      readonly color: Rgb;
      readonly align: 'left' | 'right' | 'center';
      readonly charSpace: number;
    }
  | {
      readonly kind: 'line';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly color: Rgb;
      readonly width: number;
    }
  | {
      readonly kind: 'rect';
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
      readonly stroke: Rgb;
      readonly width: number;
    }
  | {
      readonly kind: 'circle';
      readonly x: number;
      readonly y: number;
      readonly r: number;
      readonly fill: Rgb;
    }
  | {
      readonly kind: 'image';
      readonly id: string;
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
    };

export interface PdfPage {
  readonly commands: readonly DrawCommand[];
}

export interface LayoutOptions {
  readonly measure: MeasureText;
  /** The colour of each slot, as the reader's palette has it. */
  readonly slotColors: readonly Rgb[];
  /** Whether a picture was made, so a step without one gives its space to the text. */
  readonly hasImage: (id: string) => boolean;
}

export const PAGE_WIDTH = 210;
export const PAGE_HEIGHT = 297;
export const MARGIN_X = 16;
const MARGIN_TOP = 16;
const MARGIN_BOTTOM = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const CONTENT_BOTTOM = PAGE_HEIGHT - MARGIN_BOTTOM;
const FOOTER_RULE_Y = PAGE_HEIGHT - 14;
const FOOTER_TEXT_Y = PAGE_HEIGHT - 9;

const PLATE_MM = 130;
const CROP_MM = 32;
const MARK_RADIUS = 2.5;
const PT_MM = 0.3528;
const LINE_HEIGHT = 1.42;

const INK: Rgb = [17, 17, 17];
const DIM: Rgb = [84, 84, 88];
const FAINT: Rgb = [136, 136, 140];
const LINE: Rgb = [212, 212, 216];
const WHITE: Rgb = [255, 255, 255];
const FALLBACK_SLOT: Rgb = [90, 90, 90];

export const plateImageId = (key: string) => `plate:${key}`;
export const cropImageId = (key: string, throwId: string) => `crop:${key}:${throwId}`;

function lineHeight(size: number): number {
  return size * PT_MM * LINE_HEIGHT;
}

function luma([r, g, b]: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

interface TextStyle {
  readonly font?: FontId;
  readonly size?: number;
  readonly color?: Rgb;
  readonly charSpace?: number;
}

/** Lays pages out top to bottom: a cursor, a page break when the next block does not fit. */
class Flow {
  readonly pages: DrawCommand[][] = [];
  y = MARGIN_TOP;
  private running: string | null = null;
  private runningLabel: ((title: string) => string) | null = null;

  constructor(readonly options: LayoutOptions) {}

  get commands(): DrawCommand[] {
    const current = this.pages[this.pages.length - 1];
    if (current !== undefined) return current;
    this.pages.push([]);
    return this.commands;
  }

  newPage(): void {
    this.pages.push([]);
    this.y = MARGIN_TOP;
  }

  /** A section's pages after its first carry its title, so a loose sheet says what it belongs to. */
  runWith(title: string | null, label: ((title: string) => string) | null): void {
    this.running = title;
    this.runningLabel = label;
  }

  private continuation(): void {
    this.newPage();
    if (this.running === null || this.runningLabel === null) return;
    const text = fitText(
      this.runningLabel(this.running),
      CONTENT_WIDTH,
      'regular',
      8,
      this.options.measure,
    );
    this.text(text, MARGIN_X, this.y, { size: 8, color: FAINT });
    this.y += lineHeight(8) + 1;
    this.rule(this.y, LINE);
    this.y += 4;
  }

  /** Starts a new page unless `height` fits below the cursor. */
  ensure(height: number): void {
    if (this.y + height > CONTENT_BOTTOM && this.y > MARGIN_TOP + 1) this.continuation();
  }

  gap(height: number): void {
    this.y += height;
  }

  /** One line whose box starts at `y`; returns nothing, the caller moves the cursor. */
  text(
    text: string,
    x: number,
    y: number,
    style: TextStyle & { align?: 'left' | 'right' | 'center' } = {},
  ): void {
    const size = style.size ?? 10;
    const box = lineHeight(size);
    this.commands.push({
      kind: 'text',
      text,
      x,
      y: y + (box - size * PT_MM) / 2 + size * PT_MM * 0.8,
      font: style.font ?? 'regular',
      size,
      color: style.color ?? INK,
      align: style.align ?? 'left',
      charSpace: style.charSpace ?? 0,
    });
  }

  rule(
    y: number,
    color: Rgb = LINE,
    width = 0.2,
    x1 = MARGIN_X,
    x2 = MARGIN_X + CONTENT_WIDTH,
  ): void {
    this.commands.push({ kind: 'line', x1, y1: y, x2, y2: y, color, width });
  }

  wrap(text: string, width: number, style: TextStyle): readonly string[] {
    return wrapText(text, width, style.font ?? 'regular', style.size ?? 10, this.options.measure);
  }

  /** A paragraph that may run onto the next page, line by line. */
  paragraph(text: string, x: number, width: number, style: TextStyle = {}): void {
    const size = style.size ?? 10;
    for (const line of this.wrap(text, width, style)) {
      this.ensure(lineHeight(size));
      this.text(line, x, this.y, style);
      this.y += lineHeight(size);
    }
  }

  slotColor(slot: number): Rgb {
    return this.options.slotColors[slot] ?? FALLBACK_SLOT;
  }

  /** A player's number on their colour, centred on (`x`, `y`). */
  mark(slot: number, x: number, y: number): void {
    const fill = this.slotColor(slot);
    this.commands.push({ kind: 'circle', x, y, r: MARK_RADIUS, fill });
    const size = 8;
    this.commands.push({
      kind: 'text',
      text: String(slot + 1),
      x,
      y: y + size * PT_MM * 0.36,
      font: 'semibold',
      size,
      color: luma(fill) > 150 ? INK : WHITE,
      align: 'center',
      charSpace: 0,
    });
  }

  /** A small caps-style label with a hairline under it, opening a block of the page. */
  heading(text: string, followingHeight: number): void {
    const size = 7.5;
    this.ensure(5 + lineHeight(size) + 3 + followingHeight);
    this.gap(5);
    this.text(text, MARGIN_X, this.y, { font: 'semibold', size, color: DIM, charSpace: 0.35 });
    this.y += lineHeight(size) + 0.8;
    this.rule(this.y);
    this.y += 2.2;
  }
}

function coverBlock(flow: Flow, cover: PdfCover): void {
  flow.text(`disalytics · ${cover.eyebrow}`, MARGIN_X, flow.y, {
    font: 'semibold',
    size: 8,
    color: DIM,
    charSpace: 0.4,
  });
  flow.y += lineHeight(8) + 3;

  const title = { font: 'semibold', size: 26 } as const;
  for (const line of flow.wrap(cover.title, CONTENT_WIDTH, title)) {
    flow.text(line, MARGIN_X, flow.y, title);
    flow.y += lineHeight(26) * 0.92;
  }
  flow.y += 2;
  flow.paragraph(cover.subtitle, MARGIN_X, CONTENT_WIDTH, { size: 11, color: DIM });
  flow.y += 3;
  flow.rule(flow.y, INK, 0.5);
  flow.y += 4;

  for (const fact of cover.facts) {
    flow.ensure(lineHeight(10));
    flow.text(fact.label, MARGIN_X, flow.y, { size: 8.5, color: DIM });
    flow.text(fact.value, MARGIN_X + 34, flow.y, { size: 10 });
    flow.y += lineHeight(10) + 0.6;
  }
  if (cover.description !== null) {
    flow.y += 3;
    flow.text(cover.description.label, MARGIN_X, flow.y, { size: 8.5, color: DIM });
    flow.y += lineHeight(8.5);
    flow.paragraph(cover.description.text, MARGIN_X, CONTENT_WIDTH, { size: 10 });
  }
}

const LOADOUT_WEAPON_X = MARGIN_X + 36;
const LOADOUT_GRENADE_X = MARGIN_X + 76;
const LOADOUT_COST_X = MARGIN_X + CONTENT_WIDTH;

function loadoutRow(flow: Flow, row: PdfLoadoutRow): void {
  const grenadeWidth = LOADOUT_COST_X - 16 - LOADOUT_GRENADE_X;
  const grenadeLines =
    row.grenades === null ? [] : flow.wrap(row.grenades, grenadeWidth, { size: 9 });
  const dropLines = row.drops.flatMap((drop) => flow.wrap(drop, grenadeWidth, { size: 8 }));
  const rows = Math.max(1, grenadeLines.length);
  const height = rows * lineHeight(9) + dropLines.length * lineHeight(8) + 1.6;
  flow.ensure(height);
  const top = flow.y;
  flow.mark(row.slot, MARGIN_X + MARK_RADIUS, top + lineHeight(9) / 2);
  flow.text(row.name, MARGIN_X + 7, top, { font: 'semibold', size: 9 });
  flow.text(row.weapon, LOADOUT_WEAPON_X, top, { size: 9 });
  grenadeLines.forEach((line, index) => {
    flow.text(line, LOADOUT_GRENADE_X, top + index * lineHeight(9), { size: 9 });
  });
  dropLines.forEach((line, index) => {
    flow.text(line, LOADOUT_GRENADE_X, top + rows * lineHeight(9) + index * lineHeight(8), {
      size: 8,
      color: DIM,
    });
  });
  if (row.cost !== null) flow.text(row.cost, LOADOUT_COST_X, top, { size: 9, align: 'right' });
  flow.y = top + height;
}

function loadoutBlock(flow: Flow, cover: PdfCover): void {
  if (cover.loadout.length === 0) return;
  flow.heading(cover.loadoutTitle, lineHeight(9) * 2);
  for (const row of cover.loadout) loadoutRow(flow, row);
  if (cover.teamCost !== null) {
    flow.ensure(lineHeight(9) + 2);
    flow.rule(flow.y);
    flow.y += 1;
    flow.text(cover.teamCost.label, MARGIN_X, flow.y, { font: 'semibold', size: 9 });
    flow.text(cover.teamCost.value, LOADOUT_COST_X, flow.y, {
      font: 'semibold',
      size: 9,
      align: 'right',
    });
    flow.y += lineHeight(9) + 1;
  }
  for (const warning of cover.warnings)
    flow.paragraph(warning, MARGIN_X, CONTENT_WIDTH, { size: 8, color: DIM });
}

function planBlock(flow: Flow, plan: PdfPlanOverview): void {
  const first = plan.steps[0];
  flow.ensure(lineHeight(10.5) + lineHeight(8.5) + (first === undefined ? 0 : lineHeight(9)) + 3);
  flow.y += 2.5;
  flow.paragraph(plan.title, MARGIN_X, CONTENT_WIDTH, { font: 'semibold', size: 10.5 });
  flow.paragraph(plan.meta, MARGIN_X, CONTENT_WIDTH, { size: 8.5, color: DIM });
  for (const step of plan.steps) {
    flow.ensure(lineHeight(9));
    const nameWidth = CONTENT_WIDTH - 12 - 14;
    const lines = flow.wrap(step.name, nameWidth, { size: 9 });
    flow.text(String(step.number), MARGIN_X + 4, flow.y, { size: 9, color: DIM, align: 'right' });
    if (step.clock !== null) {
      flow.text(step.clock, MARGIN_X + CONTENT_WIDTH, flow.y, {
        size: 9,
        color: DIM,
        align: 'right',
      });
    }
    for (const line of lines.length === 0 ? [''] : lines) {
      flow.ensure(lineHeight(9));
      flow.text(line, MARGIN_X + 8, flow.y, { size: 9 });
      flow.y += lineHeight(9);
    }
  }
}

function plansBlock(flow: Flow, cover: PdfCover): void {
  if (cover.plans.length === 0) return;
  flow.heading(cover.plansTitle, lineHeight(10.5) * 3);
  for (const plan of cover.plans) planBlock(flow, plan);
}

function stepHeader(flow: Flow, section: PdfStepSection): void {
  if (section.banner !== null) {
    flow.text(section.banner.eyebrow, MARGIN_X, flow.y, {
      font: 'semibold',
      size: 8,
      color: DIM,
      charSpace: 0.35,
    });
    flow.y += lineHeight(8) + 1;
    flow.paragraph(section.banner.title, MARGIN_X, CONTENT_WIDTH, { font: 'semibold', size: 18 });
    if (section.banner.out !== null) {
      flow.paragraph(section.banner.out, MARGIN_X, CONTENT_WIDTH, { size: 9.5, color: DIM });
    }
    flow.y += 2;
    flow.rule(flow.y, INK, 0.5);
    flow.y += 6;
  }
  flow.text(section.eyebrow, MARGIN_X, flow.y, {
    font: 'semibold',
    size: 8,
    color: DIM,
    charSpace: 0.35,
  });
  flow.y += lineHeight(8) + 0.6;
  const clockWidth = 46;
  const title = { font: 'semibold', size: 15 } as const;
  const lines = flow.wrap(section.title, CONTENT_WIDTH - clockWidth - 4, title);
  if (section.startsAt !== null) {
    flow.text(section.startsAt, MARGIN_X + CONTENT_WIDTH, flow.y + 1, {
      size: 9,
      color: DIM,
      align: 'right',
    });
  }
  for (const line of lines) {
    flow.text(line, MARGIN_X, flow.y, title);
    flow.y += lineHeight(15);
  }
  flow.y += 1.5;
  flow.rule(flow.y);
  flow.y += 5;
}

function plateBlock(flow: Flow, section: PdfStepSection): void {
  const id = plateImageId(section.key);
  if (!flow.options.hasImage(id)) return;
  flow.ensure(PLATE_MM);
  const x = MARGIN_X + (CONTENT_WIDTH - PLATE_MM) / 2;
  flow.commands.push({ kind: 'image', id, x, y: flow.y, w: PLATE_MM, h: PLATE_MM });
  flow.commands.push({
    kind: 'rect',
    x,
    y: flow.y,
    w: PLATE_MM,
    h: PLATE_MM,
    stroke: LINE,
    width: 0.25,
  });
  flow.y += PLATE_MM + 3;
}

const TASK_X = MARGIN_X + 36;

function playerRow(flow: Flow, player: PdfPlayerEntry, headings: PdfContent['headings']): void {
  const detail = player.isOut ? headings.out : (player.task ?? headings.noTask);
  const detailColor = player.isOut || player.task === null ? FAINT : INK;
  const lines = flow.wrap(detail, MARGIN_X + CONTENT_WIDTH - TASK_X, { size: 9.5 });
  const side = player.label === null ? 1 : 2;
  const taskLines = lines.length + (player.delay === null ? 0 : 1);
  const height = Math.max(side, taskLines) * lineHeight(9.5) + 1.8;
  flow.ensure(height);
  const top = flow.y;
  flow.mark(player.slot, MARGIN_X + MARK_RADIUS, top + lineHeight(9.5) / 2);
  flow.text(player.name, MARGIN_X + 7, top, { font: 'semibold', size: 9.5 });
  if (player.label !== null) {
    flow.text(player.label, MARGIN_X + 7, top + lineHeight(9.5), { size: 8.5, color: DIM });
  }
  let y = top;
  for (const line of lines) {
    flow.text(line, TASK_X, y, { size: 9.5, color: detailColor });
    y += lineHeight(9.5);
  }
  if (player.delay !== null) flow.text(player.delay, TASK_X, y, { size: 8.5, color: DIM });
  flow.y = top + height;
}

function throwRow(flow: Flow, section: PdfStepSection, entry: PdfThrowEntry): void {
  const cropId = cropImageId(section.key, entry.id);
  const hasCrop = entry.region !== null && flow.options.hasImage(cropId);
  const textX = MARGIN_X + (hasCrop ? CROP_MM + 4 : 0) + 8;
  const width = MARGIN_X + CONTENT_WIDTH - textX;
  const metaLines = flow.wrap(entry.meta, width, { size: 8.5 });
  const dropLines =
    entry.droppedBy === null ? [] : flow.wrap(entry.droppedBy, width, { size: 8.5 });
  const noteLines = entry.notes === null ? [] : flow.wrap(entry.notes, width, { size: 9 });
  const textHeight =
    lineHeight(10) +
    (metaLines.length + dropLines.length) * lineHeight(8.5) +
    noteLines.length * lineHeight(9) +
    (noteLines.length > 0 ? 1 : 0);
  const height = Math.max(hasCrop ? CROP_MM : 0, textHeight) + 3;
  flow.ensure(height);
  const top = flow.y;
  if (hasCrop) {
    flow.commands.push({ kind: 'image', id: cropId, x: MARGIN_X, y: top, w: CROP_MM, h: CROP_MM });
    flow.commands.push({
      kind: 'rect',
      x: MARGIN_X,
      y: top,
      w: CROP_MM,
      h: CROP_MM,
      stroke: LINE,
      width: 0.25,
    });
  }
  const left = MARGIN_X + (hasCrop ? CROP_MM + 4 : 0);
  flow.mark(entry.slot, left + MARK_RADIUS, top + lineHeight(10) / 2);
  flow.text(entry.kindName, textX, top, { font: 'semibold', size: 10 });
  let y = top + lineHeight(10);
  for (const line of metaLines) {
    flow.text(line, textX, y, { size: 8.5, color: DIM });
    y += lineHeight(8.5);
  }
  for (const line of dropLines) {
    flow.text(line, textX, y, { size: 8.5, color: DIM });
    y += lineHeight(8.5);
  }
  y += noteLines.length > 0 ? 1 : 0;
  for (const line of noteLines) {
    flow.text(line, textX, y, { size: 9 });
    y += lineHeight(9);
  }
  flow.y = top + height;
}

function enemyRow(flow: Flow, enemy: PdfEnemyEntry): void {
  const head = [enemy.title, enemy.role].filter((part) => part !== null).join(' · ');
  const note = enemy.note === null ? [] : flow.wrap(enemy.note, CONTENT_WIDTH - 8, { size: 9.5 });
  const facts = [enemy.takenBy, enemy.deadNote].filter((part) => part !== null).join(' · ');
  const height = lineHeight(9.5) * (1 + note.length) + (facts === '' ? 0 : lineHeight(8.5)) + 1.8;
  flow.ensure(height);
  const top = flow.y;
  flow.text(head, MARGIN_X, top, { font: 'semibold', size: 9.5 });
  let y = top + lineHeight(9.5);
  for (const line of note) {
    flow.text(line, MARGIN_X, y, { size: 9.5 });
    y += lineHeight(9.5);
  }
  if (facts !== '') flow.text(facts, MARGIN_X, y, { size: 8.5, color: DIM });
  flow.y = top + height;
}

function stepBlock(flow: Flow, section: PdfStepSection, content: PdfContent): void {
  flow.newPage();
  flow.runWith(section.title, content.continued);
  stepHeader(flow, section);
  plateBlock(flow, section);

  if (section.idea !== null) {
    flow.heading(content.headings.idea, lineHeight(10) * 2);
    flow.paragraph(section.idea, MARGIN_X, CONTENT_WIDTH, { size: 10 });
  }
  if (section.players.length > 0) {
    flow.heading(content.headings.tasks, lineHeight(9.5) * 2);
    for (const player of section.players) playerRow(flow, player, content.headings);
  }
  if (section.throws.length > 0) {
    flow.heading(section.throwsTitle, CROP_MM + 3);
    for (const entry of section.throws) throwRow(flow, section, entry);
  }
  if (section.enemies.length > 0) {
    flow.heading(content.headings.enemies, lineHeight(9.5) * 2);
    for (const enemy of section.enemies) enemyRow(flow, enemy);
  }
  flow.runWith(null, null);
}

function footers(flow: Flow, content: PdfContent): void {
  const total = flow.pages.length;
  const { measure } = flow.options;
  flow.pages.forEach((page, index) => {
    const number = content.page(index + 1, total);
    const numberWidth = measure(number, 'regular', 8);
    const title = fitText(content.title, CONTENT_WIDTH - numberWidth - 6, 'regular', 8, measure);
    page.push(
      {
        kind: 'line',
        x1: MARGIN_X,
        y1: FOOTER_RULE_Y,
        x2: MARGIN_X + CONTENT_WIDTH,
        y2: FOOTER_RULE_Y,
        color: LINE,
        width: 0.2,
      },
      {
        kind: 'text',
        text: title,
        x: MARGIN_X,
        y: FOOTER_TEXT_Y,
        font: 'regular',
        size: 8,
        color: DIM,
        align: 'left',
        charSpace: 0,
      },
      {
        kind: 'text',
        text: number,
        x: MARGIN_X + CONTENT_WIDTH,
        y: FOOTER_TEXT_Y,
        font: 'regular',
        size: 8,
        color: DIM,
        align: 'right',
        charSpace: 0,
      },
    );
  });
}

/**
 * Sets the content on A4 pages as drawing commands in millimetres: the cover first, then every step
 * on a page of its own that runs onto more pages when its text needs them. Pure — it measures text
 * through the function it is given and draws nothing.
 */
export function layoutPdf(content: PdfContent, options: LayoutOptions): readonly PdfPage[] {
  const flow = new Flow(options);
  flow.newPage();
  coverBlock(flow, content.cover);
  loadoutBlock(flow, content.cover);
  plansBlock(flow, content.cover);
  for (const section of content.sections) stepBlock(flow, section, content);
  footers(flow, content);
  return flow.pages.map((commands) => ({ commands }));
}
