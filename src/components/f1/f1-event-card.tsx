import type { F1Event, F1EventCompetition, F1EventFilters } from "@/types/f1";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";
import dayjs from "dayjs";
import { translateF1EventTypeAbbr } from "./utils/translateF1EventType";
import { cleanUpSponsorName } from "./utils/cleanUpSponsorName";
import { fetchEventDetails } from "@/api/espn/fetchEventDetails";
import { useQuery } from "@tanstack/react-query";
import type { EventRef } from "@/types/base";
import { filterF1Event } from "./utils/filterF1Events";

type F1EventCardProps = {
  baseQueryKey: string;
  eventRef: EventRef;
  filters: F1EventFilters;
};

function F1EventCard({ baseQueryKey, eventRef, filters }: F1EventCardProps) {
  const {
    data: f1Event,
    isPending,
    error,
  } = useQuery({
    queryKey: [baseQueryKey, "event", eventRef.$ref],
    queryFn: () => fetchEventDetails<F1Event>(eventRef.$ref),
  });

  if (isPending)
    return <div className="p-4 border border-dashed">Loading Detail...</div>;
  if (!f1Event) return <div>Error looking for event</div>;
  if (error) return <div>Error: {error.message}</div>;

  const filteredF1Event = filterF1Event(f1Event, filters);
  if (!filteredF1Event) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          {cleanUpSponsorName(filteredF1Event.name)}
        </h3>
      </CardHeader>
      <CardContent>
        <Table>
          <TableBody>
            {filteredF1Event.competitions.map(
              (competition: F1EventCompetition) => (
                <TableRow key={competition.id}>
                  <DateCell date={competition.date} />
                  <NameCell type={competition.type.abbreviation} />
                  <TimeCell date={competition.date} />
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DateCell({ date }: { date: string }) {
  const shortDate = dayjs(date).format("DD");
  const shortMonth = dayjs(date).format("MMM").toUpperCase();
  return (
    <TableCell>
      <div className="text-xl font-semibold">{shortDate}</div>
      <div className="text-xs">{shortMonth}</div>
    </TableCell>
  );
}

function NameCell({ type }: { type: string }) {
  return (
    <TableCell className="text-base">
      {translateF1EventTypeAbbr(type)}
    </TableCell>
  );
}

function TimeCell({ date }: { date: string }) {
  const time = dayjs(date).format("HH:mm");
  return <TableCell className="text-base">{time}</TableCell>;
}

export default F1EventCard;
