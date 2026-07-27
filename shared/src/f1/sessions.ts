import { getDurationMinutes, type SportFormat } from "../sports/formats.ts";

/**
 * ESPN identifies race-weekend sessions by numeric `competition.type.id`, so
 * they need translating to named formats before a duration can be looked up.
 * That translation is a detail of ESPN's F1 feed rather than a fact about the
 * sport, which is why it lives here and not in the shared sports module.
 *
 * Values are `| undefined` because the key is an arbitrary string: the type
 * then requires the caller to handle an id that isn't listed, instead of the
 * fallback below looking like dead code.
 */
const SESSION_FORMATS: Record<string, SportFormat<"f1"> | undefined> = {
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
export const UNKNOWN_F1_SESSION_MINUTES = 60;

/**
 * Nominal duration of a race-weekend session from its ESPN session type id,
 * falling back to {@link UNKNOWN_F1_SESSION_MINUTES} for unrecognised ids.
 */
export function getF1SessionMinutes(sessionTypeId: string): number {
  const format = SESSION_FORMATS[sessionTypeId];
  return format === undefined
    ? UNKNOWN_F1_SESSION_MINUTES
    : getDurationMinutes("f1", format);
}
