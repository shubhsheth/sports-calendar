import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexComponent,
  head: () => ({
    meta: [
      {
        title:
          "Sports Calendar: View schedules for your favorite sports in one place",
        name: "description",
        content:
          "Sports Calendar is your go-to destination for viewing schedules of your favorite sports in one convenient place. Stay up-to-date with the latest game times, matchups, and events across various sports leagues. Whether you're a fan of basketball, football, soccer, or any other sport, Sports Calendar has you covered with an easy-to-use interface and comprehensive schedule information.",
      },
    ],
  }),
});

function IndexComponent() {
  return (
    <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
      <Link
        to="/nba"
        className="border-1 rounded-lg py-8 px-4 text-center hover:bg-gray-100"
      >
        View NBA Schedule
      </Link>
      <Link
        to="/f1"
        className="border-1 rounded-lg py-8 px-4 text-center hover:bg-gray-100"
      >
        View F1 Schedule
      </Link>
    </div>
  );
}
