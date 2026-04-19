export function translateF1EventTypeId(type: string): string {
  switch (type) {
    case "1":
      return "Practice";
    case "2":
      return "Qualifying";
    case "3":
      return "Race";
    case "4":
      return "Spring Qualifying";
    case "6":
      return "Spring Race";
    default:
      return "Other";
  }
}
