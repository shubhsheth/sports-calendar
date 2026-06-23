/**
 * NBA/NFL `competition.type.id` reflects the game's nature (season phase). Known
 * IDs: 1 PS Preseason · 2 RS Regular Season · 3 PO Playoffs · 4 AS All-Star ·
 * 5 FIN Finals. Unknown values fall through. The same scheme applies to NFL.
 * `…Abbr` maps the API `abbreviation`; `…Id` maps the numeric `id`.
 */
export function translateNbaEventTypeAbbr(type: string): string {
  switch (type) {
    case "PS":
      return "Preseason";
    case "RS":
      return "Regular Season";
    case "PO":
      return "Playoffs";
    case "AS":
      return "All-Star";
    case "FIN":
      return "Finals";
    default:
      return type;
  }
}

export function translateNbaEventTypeId(type: string): string {
  switch (type) {
    case "1":
      return "Preseason";
    case "2":
      return "Regular Season";
    case "3":
      return "Playoffs";
    case "4":
      return "All-Star";
    case "5":
      return "Finals";
    default:
      return "Other";
  }
}
