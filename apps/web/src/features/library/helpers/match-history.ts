/**
 * Where the game writes the matches it records, one folder per operating system. A path is game
 * vocabulary rather than copy — `AGENTS.md` §11 — so it is the same string in both locales and it
 * is rendered as vocabulary rather than through `<Text>`.
 *
 * The Windows entry opens with an ellipsis on purpose: Steam's own location is the reader's, a
 * library folder can sit on any drive, and naming `C:\Program Files (x86)` would be wrong for
 * everyone who moved it. The tail is the part that saves the search either way.
 *
 * Demos from FACEIT and the other third parties are downloaded rather than recorded, so they land
 * in the browser's download folder and have no stable path. Nothing here claims one for them.
 */
const MATCH_HISTORY_FOLDER = {
  windows: '…\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\csgo\\replays',
  macos:
    '~/Library/Application Support/Steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/replays',
  linux: '~/.steam/steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/replays',
} as const;

type Desktop = keyof typeof MATCH_HISTORY_FOLDER;

/**
 * What the platform says about itself. Both fields are strings the caller reads off `navigator`,
 * which is what keeps the choice testable against fixtures in the node environment.
 */
export interface PlatformReport {
  /** `navigator.userAgentData?.platform` — the browser's own answer, where it has one. */
  readonly platform?: string | undefined;
  /** `navigator.userAgent`, read only when the first is absent. */
  readonly userAgent?: string | undefined;
  /** `navigator.maxTouchPoints`. iPadOS reports a Macintosh user agent; this is what tells them apart. */
  readonly maxTouchPoints?: number | undefined;
}

// The values User-Agent Client Hints is allowed to report. A browser that answers with anything
// else — `Android`, `Chrome OS`, `Unknown` — has answered, so its answer is taken rather than
// second-guessed against the user agent string.
function fromPlatform(platform: string): Desktop | null {
  switch (platform) {
    case 'Windows':
      return 'windows';
    case 'macOS':
      return 'macos';
    case 'Linux':
      return 'linux';
    default:
      return null;
  }
}

function fromUserAgent(userAgent: string, maxTouchPoints: number): Desktop | null {
  // Android carries `Linux` in the same string, and Chrome OS carries neither a Steam install nor
  // the Linux paths, so both are ruled out before anything is matched.
  if (/Android|CrOS/.test(userAgent)) return null;
  if (/iPhone|iPod/.test(userAgent)) return null;

  if (/Windows/.test(userAgent)) return 'windows';

  if (/iPad|Macintosh|Mac OS X/.test(userAgent)) {
    // An iPad asks for the desktop site by default and calls itself a Macintosh while doing it.
    return maxTouchPoints > 1 ? null : 'macos';
  }

  if (/Linux|X11/.test(userAgent)) return 'linux';

  return null;
}

/**
 * The folder this reader's demos are recorded into, or `null` when the platform reports nothing
 * that has one — a phone, a tablet, or a browser that answers with a name we do not know. The
 * screen says something useful in either case; only one of them can name a path.
 */
export function matchHistoryFolder(report: PlatformReport): string | null {
  const platform = report.platform?.trim();

  const desktop =
    platform === undefined || platform === ''
      ? fromUserAgent(report.userAgent ?? '', report.maxTouchPoints ?? 0)
      : fromPlatform(platform);

  return desktop === null ? null : MATCH_HISTORY_FOLDER[desktop];
}
