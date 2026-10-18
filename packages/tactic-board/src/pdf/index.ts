import type { Lineup, Tactic } from '@disa/demo-core';
import type { Translate } from '@disa/i18n';
import { getMapOverview, loadMapNavGrid, type RadarTheme } from '@disa/map-data';
import type { Palette } from '@disa/plate';
import { buildSchedule, type TacticSchedule } from '../helpers/tactic-schedule';
import { buildPdfContent } from './content';
import { loadPdfFonts } from './fonts';
import { layoutPdf, type Rgb } from './layout';
import { renderPlateImages } from './plate-images';
import { slotColorsRgb } from './rgb';
import { createTextMeasure, type PdfImage, writePdf } from './write';

export interface TacticPdfRequest {
  readonly tactic: Tactic;
  readonly t: Translate;
  /** Their titles name the lineups a throw is made from. */
  readonly lineups: readonly Pick<Lineup, 'id' | 'title'>[];
  readonly palette: Palette;
  readonly radarTheme: RadarTheme;
  /** Where the `/radar/` images are served from, ending in a slash. */
  readonly imageBase: string;
  readonly imageCrossOrigin?: 'anonymous' | 'use-credentials' | undefined;
}

async function schedulesOf(tactic: Tactic): Promise<ReadonlyMap<string, TacticSchedule>> {
  const overview = getMapOverview(tactic.map);
  const schedules = new Map<string, TacticSchedule>();
  if (overview === undefined) return schedules;
  const grid = await loadMapNavGrid(tactic.map);
  for (const plan of tactic.plans) {
    schedules.set(plan.id, buildSchedule({ overview, grid, tactic, planId: plan.id }));
  }
  return schedules;
}

/**
 * The tactic as a PDF to hand to a person: a cover with its loadout and plans, then a page per step
 * with the plate, the tasks, the grenades and the enemies expected. Written in the reader's
 * language, with the board's own drawing for the pictures. Rejects when the fonts cannot be had.
 */
export async function exportTacticPdf(request: TacticPdfRequest): Promise<Blob> {
  const { tactic, t, palette } = request;
  const [schedules, fonts] = await Promise.all([schedulesOf(tactic), loadPdfFonts()]);
  const content = buildPdfContent({ tactic, t, lineups: request.lineups, schedules });

  const overview = getMapOverview(tactic.map);
  const images: ReadonlyMap<string, PdfImage> =
    overview === undefined
      ? new Map()
      : await renderPlateImages({
          tactic,
          overview,
          schedules,
          sections: content.sections,
          palette,
          radarTheme: request.radarTheme,
          imageBase: request.imageBase,
          imageCrossOrigin: request.imageCrossOrigin,
          t,
        });

  const slotColors: readonly Rgb[] = slotColorsRgb(palette);
  const pages = layoutPdf(content, {
    measure: createTextMeasure(fonts),
    slotColors,
    hasImage: (id) => images.has(id),
  });
  return new Blob([writePdf(pages, images, fonts, content.title)], { type: 'application/pdf' });
}
