import type { LocaleResources } from '../../config';
import common from './common.json';
import controls from './controls.json';
import errors from './errors.json';
import filters from './filters.json';
import library from './library.json';
import radar from './radar.json';
import settings from './settings.json';
import timeline from './timeline.json';

export default {
  common,
  library,
  controls,
  timeline,
  filters,
  radar,
  settings,
  errors,
} satisfies LocaleResources;
