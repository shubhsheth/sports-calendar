import type { CricketTeamFilters } from "@sports-calendar/shared";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { analytics } from "@/lib/analytics";
import {
  CRICKET_FORMAT_OPTIONS,
  toggleFormatFilter,
  toggleShowPastEvents,
} from "./utils/filterState";

type CricketTeamFilterSelectorProps = {
  filters: CricketTeamFilters;
  setFilters: React.Dispatch<React.SetStateAction<CricketTeamFilters>>;
};

/**
 * The team page's filter side panel — same Sheet UX as the league pages: a
 * show-past-events toggle plus one checkbox per match format (no selection =
 * all formats).
 */
export function CricketTeamFilterSelector({
  filters,
  setFilters,
}: CricketTeamFilterSelectorProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          onClick={() => analytics.filterPanelOpened("cricket-team")}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filter
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Matches</SheetTitle>
        </SheetHeader>
        <div className="px-4 grid gap-6">
          <FieldSet>
            <FieldLegend>Past events</FieldLegend>
            <FieldDescription>
              Whether to show matches that have already finished
            </FieldDescription>
            <FieldGroup>
              <Field orientation="horizontal">
                <Checkbox
                  id="show-past-events"
                  checked={filters.showPastEvents}
                  onCheckedChange={() => {
                    analytics.filterShowPastEventsToggled(
                      "cricket-team",
                      !filters.showPastEvents
                    );
                    toggleShowPastEvents(filters, setFilters);
                  }}
                />
                <FieldLabel htmlFor="show-past-events">
                  Show past events
                </FieldLabel>
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Formats</FieldLegend>
            <FieldDescription>
              Show only the selected formats. No selection shows all.
            </FieldDescription>
            <FieldGroup>
              {CRICKET_FORMAT_OPTIONS.map(format => (
                <Field key={format.id} orientation="horizontal">
                  <Checkbox
                    id={`format-${format.id}`}
                    checked={filters.formats.includes(format.id)}
                    onCheckedChange={() => {
                      analytics.filterEventTypeToggled(
                        "cricket-team",
                        format.id,
                        filters.formats.includes(format.id)
                          ? "removed"
                          : "added"
                      );
                      toggleFormatFilter(format.id, filters, setFilters);
                    }}
                  />
                  <FieldLabel htmlFor={`format-${format.id}`}>
                    {format.label}
                  </FieldLabel>
                </Field>
              ))}
            </FieldGroup>
          </FieldSet>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default CricketTeamFilterSelector;
