/**
 * Nominal duration in minutes per sport and format.
 *
 * Keyed by **sport, not league**. A duration belongs to the game, not the
 * competition: IPL and international T20s are both 240 minutes for the same
 * reason, so league keying recorded one fact twice. Keying by sport states it
 * once, and a new league of a sport already listed here needs no entry at all.
 *
 * Sport names follow the taxonomy already used for ESPN's Core API paths (see
 * `CORE_PATHS` in `client/api/calendar/fetchPinnedEventDetails.ts`), so there is
 * only one naming scheme in the codebase. Per that convention `football` is
 * American football and `soccer` is the association game.
 *
 * These are nominal, not measured: they answer "how long should we assume this
 * runs?" for live/past checks and calendar spans, not "how long did it run".
 */
export const SPORT_FORMATS = {
  cricket: {
    test: 5 * 24 * 60,
    odi: 480,
    /** International T20. Distinct from `t20` — see the note below. */
    t20i: 240,
    /**
     * Domestic and franchise T20 (e.g. the IPL). Shares `t20i`'s duration but
     * is a different competition class, and the two are deliberately not
     * merged: `t20i` is a persisted value (feed query params, saved
     * subscription filters), so it cannot absorb the other without breaking
     * existing feeds, and calling franchise cricket "international" is simply
     * wrong.
     */
    t20: 240,
    other: 240,
  },
  basketball: { standard: 150 },
  football: { standard: 210 },
  soccer: { standard: 120 },
  racing: {
    practice: 60,
    qualifying: 60,
    race: 120,
    sprintQualifying: 45,
    sprint: 30,
  },
} as const;

/** A sport the app carries schedules for. */
export type Sport = keyof typeof SPORT_FORMATS;

/**
 * The format names valid for one sport. Derived from {@link SPORT_FORMATS}
 * rather than declared alongside it, so the two can never drift.
 */
export type SportFormat<S extends Sport> = keyof (typeof SPORT_FORMATS)[S] &
  string;

/**
 * Widened view of {@link SPORT_FORMATS} for lookup. TypeScript cannot prove a
 * doubly-generic index into the literal type yields a number, so the widening
 * happens once here rather than as a cast inside the helper — the helper's
 * signature still enforces the pair.
 */
const DURATION_LOOKUP: Record<Sport, Record<string, number>> = SPORT_FORMATS;

/**
 * Nominal duration of one event, in minutes.
 *
 * The `(sport, format)` pair is checked at compile time — an unknown format for
 * a sport will not type, rather than silently resolving to a default. The one
 * place a format genuinely isn't known until runtime is a racing session id
 * from ESPN; {@link getRacingSessionMinutes} handles that case explicitly.
 */
export function getDurationMinutes<S extends Sport>(
  sport: S,
  format: SportFormat<S>
): number {
  return DURATION_LOOKUP[sport][format];
}

/**
 * ESPN identifies race-weekend sessions by numeric `competition.type.id`, so
 * they need translating to format names before a duration can be looked up.
 */
export const RACING_SESSION_FORMATS: Record<string, SportFormat<"racing">> = {
  "1": "practice", // FP1 / FP2 / FP3
  "2": "qualifying",
  "3": "race",
  "5": "sprintQualifying", // "Sprint Shootout"
  "6": "sprint",
};

/**
 * Fallback for a session id the app has never seen. ESPN occasionally adds
 * session types, and an unknown one should still get a plausible window rather
 * than zero — which would mark the session past the moment it started.
 */
export const UNKNOWN_RACING_SESSION_MINUTES = 60;

/**
 * Nominal duration of a race-weekend session from its ESPN session type id,
 * falling back to {@link UNKNOWN_RACING_SESSION_MINUTES} for unrecognised ids.
 */
export function getRacingSessionMinutes(sessionTypeId: string): number {
  const format = RACING_SESSION_FORMATS[sessionTypeId];
  return format === undefined
    ? UNKNOWN_RACING_SESSION_MINUTES
    : SPORT_FORMATS.racing[format];
}
