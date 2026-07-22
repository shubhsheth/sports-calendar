/** Which home tile grids are shown; both can be on at once. */
export type HomeSections = { leagues: boolean; teams: boolean };

export type HomeSection = keyof HomeSections;

export const HOME_SECTIONS_STORAGE_KEY = "home-sections";

/** Leagues is pre-selected on first visit. */
export const DEFAULT_HOME_SECTIONS: HomeSections = {
  leagues: true,
  teams: false,
};

/** Repairs whatever came out of localStorage into a valid selection. */
export function normalizeHomeSections(stored: unknown): HomeSections {
  const raw = (stored ?? {}) as Partial<Record<keyof HomeSections, unknown>>;
  return {
    leagues: typeof raw.leagues === "boolean" ? raw.leagues : true,
    teams: typeof raw.teams === "boolean" ? raw.teams : false,
  };
}
