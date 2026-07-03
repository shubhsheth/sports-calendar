import { createFileRoute } from "@tanstack/react-router";
import { MyCalendarPage } from "@/components/my-calendar/my-calendar-page";

export const Route = createFileRoute("/my-calendar")({
  component: MyCalendarPage,
  head: () => ({
    meta: [
      {
        title:
          "My Calendar - Sports Calendar: View schedules for your favorite sports in one place",
        name: "description",
        content:
          "Your personal calendar: combine filtered leagues and pinned games into one live feed.",
      },
    ],
  }),
});
