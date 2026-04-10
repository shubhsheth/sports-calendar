import {Badge} from '@/components/ui/badge';
import {X} from 'lucide-react';

type FilterPillProps = {
  label: string;
  onRemove: () => void;
  imgSrc?: string;
};

export function FilterPill({label, onRemove, imgSrc}: FilterPillProps) {
  return (
    <Badge variant="secondary" className="h-auto py-1 px-3">
      {imgSrc && (
        <img src={imgSrc} alt="" className="size-4 object-contain shrink-0" />
      )}
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label} filter`}>
        <X />
      </button>
    </Badge>
  );
}
