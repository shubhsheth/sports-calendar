import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CricketTeamEvent } from "@sports-calendar/shared";
import CricketTeamEventCard from "./cricket-team-event-card";

// The card embeds PinEventButton, which needs auth context; accounts are
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

function makeEvent(
  overrides: Partial<CricketTeamEvent> = {}
): CricketTeamEvent {
  return {
    id: "1544001",
    uid: "s:200~e:1544001",
    date: daysFromNow(3),
    endDate: undefined,
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
        detail: "Scheduled",
        shortDetail: "Scheduled",
      },
      summary: "",
      longSummary: "",
    },
    competitors: [
      {
        id: "8",
        uid: "c8",
        order: 1,
        homeAway: "home",
        winner: false,
        displayName: "Sri Lanka",
        abbreviation: "SL",
        score: "",
        logo: "https://a.espncdn.com/i/teamlogos/cricket/500/8.png",
      },
      {
        id: "6",
        uid: "c6",
        order: 2,
        homeAway: "away",
        winner: false,
        displayName: "India",
        abbreviation: "IND",
        score: "",
        logo: "https://a.espncdn.com/i/teamlogos/cricket/500/6.png",
      },
    ],
    venue: { fullName: "Galle International Stadium" },
    ...overrides,
  };
}

function renderCard(event: CricketTeamEvent) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CricketTeamEventCard event={event} />
    </QueryClientProvider>
  );
}

describe("CricketTeamEventCard", () => {
  it("shows teams, series name, format badge, and venue", () => {
    renderCard(makeEvent());
    expect(screen.getByText("Sri Lanka")).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();
    expect(
      screen.getByText("India tour of Sri Lanka 2026")
    ).toBeInTheDocument();
    expect(screen.getByText("1st Test")).toBeInTheDocument();
    expect(screen.getByText(/Galle International Stadium/)).toBeInTheDocument();
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  });

  it("falls back to the format code when ESPN gives no detail", () => {
    renderCard(makeEvent({ format: "t20i", formatDetail: "" }));
    expect(screen.getByText("T20I")).toBeInTheDocument();
  });

  it("shows the live badge across a multi-day Test in progress", () => {
    renderCard(
      makeEvent({
        date: daysFromNow(-2),
        endDate: daysFromNow(2),
      })
    );
    expect(screen.getByText(/live/i)).toBeInTheDocument();
  });
});
