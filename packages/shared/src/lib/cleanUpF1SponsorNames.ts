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
