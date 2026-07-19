import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CricketTeamEvent, IplEvent } from "@sports-calendar/shared";
import { CombinedSchedule } from "./combined-schedule";
import type { CombinedEntry } from "./utils/useCombinedSchedule";

// League cards embed PinEventButton, which needs auth context; accounts are
// "not configured" here so it renders nothing.
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    enabled: false,
    loading: false,
    user: null,
    signInWithGoogle: vi.fn(),
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const cricketEntry: CombinedEntry = {
  source: "cricket-team",
  event: {
    id: "c1",
    uid: "u1",
    date: daysFromNow(1),
    timeValid: true,
    name: "Sri Lanka v India",
    shortName: "SL v IND",
    seriesId: "24567",
    seriesName: "India tour of Sri Lanka 2026",
    format: "test",
    formatDetail: "1st Test",
    fullStatus: {
      type: {
        id: "0",
        state: "pre",
        description: "Scheduled",
        detail: "",
        shortDetail: "",
      },
      summary: "",
      longSummary: "",
    },
    competitors: [],
    venue: undefined,
  } as unknown as CricketTeamEvent,
};

const iplEntry: CombinedEntry = {
  source: "ipl",
  event: {
    id: "i1",
    uid: "u2",
    date: daysFromNow(2),
    timeValid: true,
    name: "Punjab Kings v Sunrisers Hyderabad",
    shortName: "PBKS v SRH",
    fullStatus: {
      type: {
        id: "1",
        state: "pre",
        description: "Scheduled",
        detail: "",
        shortDetail: "",
      },
      summary: "",
      longSummary: "",
    },
    competitors: [
      {
        id: "1",
        uid: "t1",
        order: 1,
        homeAway: "home",
        winner: false,
        displayName: "Punjab Kings",
        abbreviation: "PBKS",
        score: "",
        logo: "x.png",
      },
    ],
  } as unknown as IplEvent,
};

function renderSchedule(
  props: Partial<Parameters<typeof CombinedSchedule>[0]>
) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <CombinedSchedule
        entries={[]}
        isLoading={false}
        failedSources={[]}
        showPastEvents={false}
        onToggleShowPast={vi.fn()}
        {...props}
      />
    </QueryClientProvider>
  );
}

describe("CombinedSchedule", () => {
  it("renders mixed sources with their own cards in order", () => {
    renderSchedule({ entries: [cricketEntry, iplEntry] });
    // Cricket card shows its series context; IPL card shows its teams.
    expect(
      screen.getByText("India tour of Sri Lanka 2026")
    ).toBeInTheDocument();
    expect(screen.getByText("1st Test")).toBeInTheDocument();
    expect(screen.getByText("Punjab Kings")).toBeInTheDocument();
  });

  it("reports the show-past toggle", () => {
    const onToggleShowPast = vi.fn();
    renderSchedule({ onToggleShowPast });
    fireEvent.click(screen.getByLabelText("Show past events"));
    expect(onToggleShowPast).toHaveBeenCalledWith(true);
  });

  it("shows failed sources without hiding the rest", () => {
    renderSchedule({ entries: [cricketEntry], failedSources: ["NBA"] });
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load: NBA");
    expect(
      screen.getByText("India tour of Sri Lanka 2026")
    ).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", () => {
    renderSchedule({ entries: [] });
    expect(
      screen.getByText("No upcoming events for this selection.")
    ).toBeInTheDocument();
  });
});
