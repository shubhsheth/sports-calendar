import type { F1EventFilters } from "@sports-calendar/shared";
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
import { Separator } from "../ui/separator";
import { toggleEventType, toggleShowPastEvents } from "./utils/filterF1Events";
import { translateF1EventTypeId } from "@sports-calendar/shared";
import { analytics } from "@/lib/analytics";

type F1FilterSelectorProps = {
  filters: F1EventFilters;
  setFilters: React.Dispatch<React.SetStateAction<F1EventFilters>>;
};

function F1FilterSelector({ filters, setFilters }: F1FilterSelectorProps) {
  const eventTypeIds = ["1", "2", "3", "5", "6"];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          onClick={() => analytics.filterPanelOpened("f1")}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filter
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Events</SheetTitle>
        </SheetHeader>
        <div className="px-4 grid gap-4">
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
                      "f1",
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
          <Separator />
          <FieldSet>
            <FieldLegend>Event types</FieldLegend>
            <FieldDescription>
              The different types of events to be shown
            </FieldDescription>
            <FieldGroup className="gap-3">
              {eventTypeIds.map(type => (
                <Field key={type} orientation={"horizontal"}>
                  <Checkbox
                    id={`event-type-${type}`}
                    checked={filters.types.includes(type)}
                    onCheckedChange={() => {
                      analytics.filterEventTypeToggled(
                        "f1",
                        type,
                        filters.types.includes(type) ? "removed" : "added"
                      );
                      toggleEventType(type, filters, setFilters);
                    }}
                  />
                  <FieldLabel htmlFor={`event-type-${type}`}>
                    {translateF1EventTypeId(type)}
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

export default F1FilterSelector;
