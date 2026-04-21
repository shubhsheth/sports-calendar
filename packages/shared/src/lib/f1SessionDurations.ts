/** Duration in minutes per F1 session type ID */
export const F1_SESSION_DURATIONS: Record<string, number> = {
  "1": 60, // Practice (FP1 / FP2 / FP3)
  "2": 60, // Qualifying
  "3": 120, // Race
  "4": 45, // Sprint Qualifying
  "6": 30, // Sprint Race
};
