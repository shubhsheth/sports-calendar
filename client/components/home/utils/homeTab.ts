export type HomeTab = "leagues" | "teams";

export const HOME_TAB_STORAGE_KEY = "home-tab";

/** Repairs whatever came out of localStorage into a valid tab. */
export function normalizeHomeTab(stored: unknown): HomeTab {
  return stored === "teams" ? "teams" : "leagues";
}
