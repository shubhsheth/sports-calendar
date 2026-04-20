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

const SPONSORS = [
  "Qatar Airways",
  "Heineken",
  "Aramco",
  "Gulf Air",
  "STC",
  "Crypto.com",
  "Lenovo",
  "MSC Cruises",
  "Pirelli",
  "AWS",
  "Tag Heuer",
  "Singapore Airlines",
  "Etihad Airways",
];

export function cleanUpF1SponsorNames(name: string): string {
  let cleanedName = name;

  for (const sponsor of SPONSORS) {
    cleanedName = cleanedName.replace(
      new RegExp(`\\b${sponsor}\\b[\\s-]*`, "gi"),
      ""
    );
  }

  cleanedName = cleanedName
    .replace(/^[\s-]+|[\s-]+$/g, "")
    .replace(/\s{2,}/g, " ");

  return cleanedName;
}
