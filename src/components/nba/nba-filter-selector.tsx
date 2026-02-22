import type { NbaEventFilters } from "@/types/nba";
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
import { Checkbox } from "../ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "../ui/field";
import { toggleShowPastEvents } from "./utils/filterNbaEvents";

type NbaFilterSelectorProps = {
  filters: NbaEventFilters;
  setFilters: React.Dispatch<React.SetStateAction<NbaEventFilters>>;
};

function NbaFilterSelector({ filters, setFilters }: NbaFilterSelectorProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Filter</Button>
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
                  onCheckedChange={() =>
                    toggleShowPastEvents(filters, setFilters)
                  }
                />
                <FieldLabel htmlFor="show-past-events">
                  Show past events
                </FieldLabel>
              </Field>
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

export default NbaFilterSelector;
