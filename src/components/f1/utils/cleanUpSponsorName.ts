// List of sponsors extracted from provided F1 event names
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

// This function will BOTH remove the sponsor from the name, and expose which sponsor (if any) was present.
export function cleanUpSponsorName(name: string): string {
  let cleanedName = name;

  for (const sponsor of SPONSORS) {
    // Remove all occurrences of the sponsor name and any trailing spaces or dashes
    cleanedName = cleanedName.replace(
      new RegExp(`\\b${sponsor}\\b[\\s-]*`, "gi"),
      "",
    );
  }

  // Trim leading/trailing spaces or dashes and collapse multiple spaces
  cleanedName = cleanedName
    .replace(/^[\s-]+|[\s-]+$/g, "")
    .replace(/\s{2,}/g, " ");

  return cleanedName;
}
