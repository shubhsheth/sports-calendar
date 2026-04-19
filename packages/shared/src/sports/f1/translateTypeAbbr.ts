export function translateF1EventTypeAbbr(type: string): string {
  switch (type) {
    case "FP1":
      return "Free Practice 1";
    case "FP2":
      return "Free Practice 2";
    case "FP3":
      return "Free Practice 3";
    case "Sprint":
      return "Spring Qualifying";
    case "SR":
      return "Spring Race";
    case "Qual":
      return "Qualifying";
    default:
      return type;
  }
}
