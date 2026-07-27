/**
 * Nominal duration in minutes per sport and format.
 *
 * Keyed by **sport, not league**. A duration belongs to the game, not the
 * competition: a T20 runs the same length whether it is an international or an
 * IPL fixture. Keying by sport states that once, and a new league of a sport
 * already listed here needs no entry at all.
 *
 * Names follow the taxonomy already used for ESPN's Core API paths (see
 * `CORE_PATHS` in `client/api/calendar/fetchPinnedEventDetails.ts`), so there is
 * only one naming scheme in the codebase. Per that convention `football` is
 * American football and `soccer` is the association game.
 *
 * `f1` is the deliberate exception to keying by sport. Motorsport session
 * structure and length are properties of the series, not of racing: a sprint
 * qualifying session is an F1 invention, MotoGP's sprints run to different
 * lengths, and NASCAR races in stages. A single `racing` entry would therefore
 * be claiming something false about every series that isn't F1, so the series
 * is the honest granularity here. Note this is the *duration* key only — ESPN's
 * API path segment for F1 is still `racing` (see `shared/src/f1/fetch.ts`).
 *
 * These are nominal, not measured: they answer "how long should we assume this
 * runs?" for live/past checks and calendar spans, not "how long did it run".
 */
export const SPORT_FORMATS = {
  cricket: {
    test: 5 * 24 * 60,
    odi: 480,
    t20: 240,
    other: 240,
  },
  basketball: { standard: 150 },
  football: { standard: 210 },
  soccer: { standard: 120 },
  f1: {
    practice: 60,
    qualifying: 60,
    race: 120,
    sprintQualifying: 45,
    sprint: 30,
  },
};

/** A sport the app carries schedules for. */
export type Sport = keyof typeof SPORT_FORMATS;

/**
 * The format names valid for one sport. Derived from {@link SPORT_FORMATS}
 * rather than declared alongside it, so the two can never drift — an object
 * literal's keys are already literal types, which is what makes the compile-
 * time check below work.
 */
export type SportFormat<S extends Sport> = keyof (typeof SPORT_FORMATS)[S] &
  string;

/**
 * Widened view of {@link SPORT_FORMATS} for lookup. TypeScript cannot prove a
 * doubly-generic index into the literal type yields a number, so the widening
 * happens once here rather than as a cast inside the helper — the helper's
 * signature still enforces the pair. Not exported, so it cannot weaken callers.
 */
const DURATION_LOOKUP: Record<Sport, Record<string, number>> = SPORT_FORMATS;

/** Sports with a single `standard` format, where naming it adds nothing. */
type SportWithStandardFormat = {
  [S in Sport]: "standard" extends SportFormat<S> ? S : never;
}[Sport];

/**
 * Nominal duration of one event, in minutes.
 *
 * The `(sport, format)` pair is checked at compile time — an unknown format for
 * a sport will not type, rather than silently resolving to a default. Sports
 * whose only format is `standard` may omit it; sports with real formats must
 * name one.
 */
export function getDurationMinutes<S extends SportWithStandardFormat>(
  sport: S
): number;
export function getDurationMinutes<S extends Sport>(
  sport: S,
  format: SportFormat<S>
): number;
export function getDurationMinutes(sport: Sport, format = "standard"): number {
  return DURATION_LOOKUP[sport][format];
}
