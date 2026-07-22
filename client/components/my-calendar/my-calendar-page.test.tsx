import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MyCalendarPage } from "./my-calendar-page";
import { useAuth } from "@/hooks/useAuth";
import {
  useMyCalendar,
  useRegenerateFeedToken,
  useRemoveSubscription,
  useUnpinEvent,
} from "@/hooks/useMyCalendar";
import { fetchPinnedEventDetails } from "@/api/calendar/fetchPinnedEventDetails";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useMyCalendar", () => ({
  useMyCalendar: vi.fn(),
  useRegenerateFeedToken: vi.fn(),
  useRemoveSubscription: vi.fn(),
  useUnpinEvent: vi.fn(),
}));
vi.mock("@/api/calendar/fetchPinnedEventDetails", () => ({
  fetchPinnedEventDetails: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: (props: React.ComponentProps<"a"> & { to?: string }) => {
    const { to, children, ...rest } = props;
    return (
      <a href={to} {...rest}>
        {children}
      </a>
    );
  },
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseMyCalendar = vi.mocked(useMyCalendar);
const mockFetchDetails = vi.mocked(fetchPinnedEventDetails);

type AuthValue = ReturnType<typeof useAuth>;

function authState(overrides: Partial<AuthValue> = {}) {
  return {
    enabled: true,
    loading: false,
    user: { id: "user-1", email: "fan@example.com" } as AuthValue["user"],
    signInWithGoogle: vi.fn(),
    signInWithMagicLink: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  } as AuthValue;
}

function calendarQuery(data: unknown, overrides = {}) {
  return {
    data,
    isPending: false,
    error: null,
    ...overrides,
  } as ReturnType<typeof useMyCalendar>;
}

const removeMutate = vi.fn();
const regenerateMutate = vi.fn();
const unpinMutate = vi.fn();

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MyCalendarPage />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_CALENDAR_FEED_BASE_URL", "https://feeds.test/calendar");
  mockUseAuth.mockReturnValue(authState());
  mockUseMyCalendar.mockReturnValue(calendarQuery(null));
  vi.mocked(useRemoveSubscription).mockReturnValue({
    mutate: removeMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useRemoveSubscription>);
  vi.mocked(useRegenerateFeedToken).mockReturnValue({
    mutate: regenerateMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useRegenerateFeedToken>);
  vi.mocked(useUnpinEvent).mockReturnValue({
    mutate: unpinMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useUnpinEvent>);
  mockFetchDetails.mockResolvedValue({
    name: "Punjab Kings v Sunrisers Hyderabad",
    date: "2026-04-11T10:00:00Z",
  });
});

const POPULATED = {
  id: "cal-1",
  feedToken: "token-1",
  subscriptions: [
    { league: "nba", filters: { teamIds: ["10", "14"] } },
    { league: "f1", filters: { types: [] } },
  ],
  pinnedEvents: [{ league: "ipl", espnEventId: "701" }],
};

describe("MyCalendarPage", () => {
  it("prompts sign-in when signed out", () => {
    mockUseAuth.mockReturnValue(authState({ user: null }));
    renderPage();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText("Leagues")).not.toBeInTheDocument();
  });

  it("shows the empty state before anything is saved", () => {
    mockUseMyCalendar.mockReturnValue(calendarQuery(null));
    renderPage();
    expect(screen.getByText(/nothing here yet/i)).toBeInTheDocument();
  });

  it("lists subscriptions with filter summaries and pinned events", async () => {
    mockUseMyCalendar.mockReturnValue(calendarQuery(POPULATED));
    renderPage();

    expect(screen.getByText("NBA")).toBeInTheDocument();
    expect(screen.getByText("2 teams selected")).toBeInTheDocument();
    expect(screen.getByText("All sessions")).toBeInTheDocument();
    expect(
      await screen.findByText("Punjab Kings v Sunrisers Hyderabad")
    ).toBeInTheDocument();
  });

  it("removes a subscription and unpins an event", async () => {
    mockUseMyCalendar.mockReturnValue(calendarQuery(POPULATED));
    renderPage();

    fireEvent.click(
      screen.getByRole("button", { name: /remove nba subscription/i })
    );
    expect(removeMutate).toHaveBeenCalledWith(
      { league: "nba" },
      expect.anything()
    );

    fireEvent.click(
      await screen.findByRole("button", {
        name: /remove pinned event punjab kings/i,
      })
    );
    expect(unpinMutate).toHaveBeenCalledWith(
      { league: "ipl", espnEventId: "701" },
      expect.anything()
    );
  });

  it("lists a followed cricket team by name and removes just that team", () => {
    mockUseMyCalendar.mockReturnValue(
      calendarQuery({
        ...POPULATED,
        subscriptions: [
          {
            league: "cricket-team",
            filters: { teamId: "6", formats: ["test", "odi"] },
          },
          { league: "cricket-team", filters: { teamId: "2" } },
        ],
        pinnedEvents: [],
      })
    );
    renderPage();

    expect(screen.getByText("India")).toBeInTheDocument();
    expect(screen.getByText("Test, ODI")).toBeInTheDocument();
    expect(screen.getByText("Australia")).toBeInTheDocument();
    expect(screen.getByText("All formats")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /remove india subscription/i })
    );
    expect(removeMutate).toHaveBeenCalledWith(
      { league: "cricket-team", teamId: "6" },
      expect.anything()
    );
  });

  it("shows the feed links and regenerates the URL after confirmation", () => {
    mockUseMyCalendar.mockReturnValue(calendarQuery(POPULATED));
    renderPage();

    expect(
      screen.getByRole("button", { name: /copy calendar link/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /regenerate url/i }));
    expect(regenerateMutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(regenerateMutate).toHaveBeenCalled();
  });
});
