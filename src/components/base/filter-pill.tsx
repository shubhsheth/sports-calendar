import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

type FilterPillProps = {
  label: string;
  onRemove: () => void;
};

export function FilterPill({ label, onRemove }: FilterPillProps) {
  return (
    <Badge variant="secondary">
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label} filter`}>
        <X />
      </button>
    </Badge>
  );
}
