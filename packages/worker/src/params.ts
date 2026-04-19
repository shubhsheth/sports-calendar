import type {
  NbaEventFilters,
  NflEventFilters,
  F1EventFilters,
  IplEventFilters,
} from "@sports-calendar/shared";

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const VALID_F1_TYPES = new Set(["1", "2", "3", "4", "6"]);

function parseShowPastEvents(raw: string | undefined): boolean {
  if (raw === undefined) return true;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null as never; // signal invalid — handled by callers
}

function isValidShowPastEvents(raw: string | undefined): boolean {
  return raw === undefined || raw === "true" || raw === "false";
}

function parseTeamIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(",").filter(id => id.length > 0);
}

export function parseNbaParams(
  query: Record<string, string>
): ParseResult<NbaEventFilters> {
  if (!isValidShowPastEvents(query["showPastEvents"])) {
    return { ok: false, error: "showPastEvents must be 'true' or 'false'" };
  }
  return {
    ok: true,
    value: {
      showPastEvents: parseShowPastEvents(query["showPastEvents"]),
      teamIds: parseTeamIds(query["teamIds"]),
    },
  };
}

export function parseNflParams(
  query: Record<string, string>
): ParseResult<NflEventFilters> {
  if (!isValidShowPastEvents(query["showPastEvents"])) {
    return { ok: false, error: "showPastEvents must be 'true' or 'false'" };
  }
  return {
    ok: true,
    value: {
      showPastEvents: parseShowPastEvents(query["showPastEvents"]),
      teamIds: parseTeamIds(query["teamIds"]),
    },
  };
}

export function parseF1Params(
  query: Record<string, string>
): ParseResult<F1EventFilters> {
  if (!isValidShowPastEvents(query["showPastEvents"])) {
    return { ok: false, error: "showPastEvents must be 'true' or 'false'" };
  }
  const rawTypes = query["types"];
  const types = rawTypes
    ? rawTypes.split(",").filter(t => t.length > 0)
    : ["1", "2", "3", "4", "6"]; // default: all session types
  const invalid = types.find(t => !VALID_F1_TYPES.has(t));
  if (invalid) {
    return { ok: false, error: `Invalid F1 session type: '${invalid}'. Valid types: 1, 2, 3, 4, 6` };
  }
  return {
    ok: true,
    value: {
      showPastEvents: parseShowPastEvents(query["showPastEvents"]),
      types,
    },
  };
}

export function parseIplParams(
  query: Record<string, string>
): ParseResult<IplEventFilters> {
  if (!isValidShowPastEvents(query["showPastEvents"])) {
    return { ok: false, error: "showPastEvents must be 'true' or 'false'" };
  }
  return {
    ok: true,
    value: {
      showPastEvents: parseShowPastEvents(query["showPastEvents"]),
      teamIds: parseTeamIds(query["teamIds"]),
    },
  };
}
