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
