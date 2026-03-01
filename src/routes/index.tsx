import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexComponent,
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
