import type { FifaEventFilters } from "@sports-calendar/shared";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { Button } from "../ui/button";
import { SlidersHorizontal } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../ui/field";
import { toggleShowPastEvents } from "./utils/filterFifaEvents";
import { TeamFilterFieldSet } from "./fifa-team-filter-fieldset";
import { analytics } from "@/lib/analytics";

type FifaFilterSelectorProps = {
  filters: FifaEventFilters;
  setFilters: React.Dispatch<React.SetStateAction<FifaEventFilters>>;
};

function FifaFilterSelector({ filters, setFilters }: FifaFilterSelectorProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          onClick={() => analytics.filterPanelOpened("fifa")}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filter
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Events</SheetTitle>
        </SheetHeader>
        <div className="px-4 grid gap-6">
          <FieldSet>
            <FieldLegend>Past events</FieldLegend>
            <FieldDescription>
              Whether to show events that have already occurred
            </FieldDescription>
            <FieldGroup>
              <Field orientation={"horizontal"}>
                <Checkbox
                  id="show-past-events"
                  checked={filters.showPastEvents}
                  onCheckedChange={() => {
                    analytics.filterShowPastEventsToggled(
                      "fifa",
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

          <TeamFilterFieldSet filters={filters} setFilters={setFilters} />
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

export default FifaFilterSelector;
