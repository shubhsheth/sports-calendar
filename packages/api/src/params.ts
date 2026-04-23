import type {
  F1EventFilters,
  IplEventFilters,
  NbaEventFilters,
  NflEventFilters,
} from "@sports-calendar/shared";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const VALID_F1_TYPES = ["1", "2", "3", "4", "6"];

function parseShowPastEvents(raw: string | undefined): ParseResult<boolean> {
  if (raw === undefined) return { ok: true, value: true };
  if (raw === "true") return { ok: true, value: true };
  if (raw === "false") return { ok: true, value: false };
  return { ok: false, error: `Invalid showPastEvents value: "${raw}". Must be "true" or "false".` };
}

function parseTeamIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").filter(id => id.length > 0);
}

export function parseNbaParams(query: Record<string, string>): ParseResult<NbaEventFilters> {
  const showPastResult = parseShowPastEvents(query["showPastEvents"]);
  if (!showPastResult.ok) return showPastResult;
  return { ok: true, value: { showPastEvents: showPastResult.value, teamIds: parseTeamIds(query["teamIds"]) } };
}

export function parseNflParams(query: Record<string, string>): ParseResult<NflEventFilters> {
  const showPastResult = parseShowPastEvents(query["showPastEvents"]);
  if (!showPastResult.ok) return showPastResult;
  return { ok: true, value: { showPastEvents: showPastResult.value, teamIds: parseTeamIds(query["teamIds"]) } };
}

export function parseF1Params(query: Record<string, string>): ParseResult<F1EventFilters> {
  const showPastResult = parseShowPastEvents(query["showPastEvents"]);
  if (!showPastResult.ok) return showPastResult;

  let types: string[];
  if (!query["types"]) {
    types = [...VALID_F1_TYPES];
  } else {
    const raw = query["types"].split(",").filter(t => t.length > 0);
    const invalid = raw.find(t => !VALID_F1_TYPES.includes(t));
    if (invalid !== undefined) {
      return { ok: false, error: `Invalid F1 session type: "${invalid}". Valid values: ${VALID_F1_TYPES.join(", ")}.` };
    }
    types = raw;
  }

  return { ok: true, value: { showPastEvents: showPastResult.value, types } };
}

export function parseIplParams(query: Record<string, string>): ParseResult<IplEventFilters> {
  const showPastResult = parseShowPastEvents(query["showPastEvents"]);
  if (!showPastResult.ok) return showPastResult;
  return { ok: true, value: { showPastEvents: showPastResult.value, teamIds: parseTeamIds(query["teamIds"]) } };
}
