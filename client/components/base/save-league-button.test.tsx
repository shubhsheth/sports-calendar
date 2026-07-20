import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import SaveLeagueButton from "./save-league-button";
import { useAuth } from "@/hooks/useAuth";
import { useMyCalendar, useUpsertSubscription } from "@/hooks/useMyCalendar";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useMyCalendar", () => ({
  useMyCalendar: vi.fn(),
  useUpsertSubscription: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseMyCalendar = vi.mocked(useMyCalendar);
const mockUseUpsertSubscription = vi.mocked(useUpsertSubscription);

type AuthValue = ReturnType<typeof useAuth>;

function signedIn(overrides: Partial<AuthValue> = {}) {
  return {
    enabled: true,
    loading: false,
    user: { id: "user-1" } as AuthValue["user"],
    signInWithGoogle: vi.fn(),
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  } as AuthValue;
}

function calendarWith(subscriptions: { league: string; filters?: unknown }[]) {
  return {
    data: { id: "cal-1", feedToken: "t", subscriptions, pinnedEvents: [] },
  } as ReturnType<typeof useMyCalendar>;
}

const mutate = vi.fn();

beforeEach(() => {
  mutate.mockClear();
  mockUseAuth.mockReturnValue(signedIn());
  mockUseMyCalendar.mockReturnValue(calendarWith([]));
  mockUseUpsertSubscription.mockReturnValue({
    mutate,
    isPending: false,
  } as unknown as ReturnType<typeof useUpsertSubscription>);
});

describe("SaveLeagueButton", () => {
  it("renders nothing when accounts are not configured", () => {
    mockUseAuth.mockReturnValue(signedIn({ enabled: false }));
    const { container } = render(
      <SaveLeagueButton league="nba" subscriptionFilters={{ teamIds: [] }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("prompts sign-in when signed out", () => {
    mockUseAuth.mockReturnValue(signedIn({ user: null }));
    render(
      <SaveLeagueButton league="nba" subscriptionFilters={{ teamIds: [] }} />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /save to my calendar/i })
    );
    expect(mutate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  it("saves the league with the current filters when signed in", () => {
    render(
      <SaveLeagueButton
        league="nba"
        subscriptionFilters={{ teamIds: ["10", "14"] }}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /save to my calendar/i })
    );
    expect(mutate).toHaveBeenCalledWith(
      { league: "nba", filters: { teamIds: ["10", "14"] } },
      expect.anything()
    );
  });

  it("reflects the already-subscribed state and still updates filters", () => {
    mockUseMyCalendar.mockReturnValue(calendarWith([{ league: "f1" }]));
    render(
      <SaveLeagueButton league="f1" subscriptionFilters={{ types: ["3"] }} />
    );

    const button = screen.getByRole("button", { name: /update my calendar/i });
    fireEvent.click(button);
    expect(mutate).toHaveBeenCalledWith(
      { league: "f1", filters: { types: ["3"] } },
      expect.anything()
    );
  });

  it("matches cricket-team subscriptions per followed team", () => {
    mockUseMyCalendar.mockReturnValue(
      calendarWith([{ league: "cricket-team", filters: { teamId: "6" } }])
    );

    const { rerender } = render(
      <SaveLeagueButton
        league="cricket-team"
        subscriptionFilters={{ teamId: "6", formats: [] }}
      />
    );
    expect(
      screen.getByRole("button", { name: /update my calendar/i })
    ).toBeInTheDocument();

    // A different team is not yet subscribed.
    rerender(
      <SaveLeagueButton
        league="cricket-team"
        subscriptionFilters={{ teamId: "2", formats: [] }}
      />
    );
    expect(
      screen.getByRole("button", { name: /save to my calendar/i })
    ).toBeInTheDocument();
  });
});
