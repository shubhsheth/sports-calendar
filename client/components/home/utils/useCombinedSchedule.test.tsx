import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type {
  CricketTeamEvent,
  IplEvent,
  NbaEvent,
} from "@sports-calendar/shared";
import {
  fetchAllCricketTeamEvents,
  fetchAllIplEvents,
  fetchAllNbaEvents,
} from "@sports-calendar/shared";
import { useCombinedSchedule } from "./useCombinedSchedule";
import { EMPTY_HOME_SELECTION } from "./selectionState";

vi.mock("@sports-calendar/shared", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  fetchAllCricketTeamEvents: vi.fn(),
  fetchAllNbaEvents: vi.fn(),
  fetchAllIplEvents: vi.fn(),
}));

const mockCricket = vi.mocked(fetchAllCricketTeamEvents);
const mockNba = vi.mocked(fetchAllNbaEvents);
const mockIpl = vi.mocked(fetchAllIplEvents);

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

const cricketEvent = (
  id: string,
  date: string,
  format: CricketTeamEvent["format"] = "t20i"
) =>
  ({
    id,
    date,
    format,
    endDate: undefined,
    competitors: [],
  }) as unknown as CricketTeamEvent;

const nbaEvent = (id: string, date: string) =>
  ({
    id,
    date,
    competitions: [{ date, competitors: [] }],
  }) as unknown as NbaEvent;

const iplEvent = (id: string, date: string) =>
  ({ id, date, competitors: [] }) as unknown as IplEvent;

let client: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  mockCricket.mockReset();
  mockNba.mockReset();
  mockIpl.mockReset();
});

describe("useCombinedSchedule", () => {
  it("issues no queries when nothing is selected", () => {
    const { result } = renderHook(
      () => useCombinedSchedule(EMPTY_HOME_SELECTION, false),
      { wrapper }
    );
    expect(result.current.entries).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(mockCricket).not.toHaveBeenCalled();
    expect(mockNba).not.toHaveBeenCalled();
  });

  it("merges selected sources chronologically with tagged entries", async () => {
    mockCricket.mockResolvedValue([cricketEvent("c1", daysFromNow(3))]);
    mockNba.mockResolvedValue([
      nbaEvent("n1", daysFromNow(1)),
      nbaEvent("n2", daysFromNow(5)),
    ]);
    const { result } = renderHook(
      () =>
        useCombinedSchedule(
          { teamIds: ["6"], leagues: ["nba"], formats: [] },
          false
        ),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(
      result.current.entries.map(e => `${e.source}:${e.event.id}`)
    ).toEqual(["nba:n1", "cricket-team:c1", "nba:n2"]);
    expect(mockCricket).toHaveBeenCalledWith("6");
  });

  it("applies the cricket format filter without touching league events", async () => {
    mockCricket.mockResolvedValue([
      cricketEvent("c1", daysFromNow(1), "test"),
      cricketEvent("c2", daysFromNow(2), "t20i"),
    ]);
    mockIpl.mockResolvedValue([iplEvent("i1", daysFromNow(3))]);
    const { result } = renderHook(
      () =>
        useCombinedSchedule(
          { teamIds: ["6"], leagues: ["ipl"], formats: ["test"] },
          false
        ),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(
      result.current.entries.map(e => `${e.source}:${e.event.id}`)
    ).toEqual(["cricket-team:c1", "ipl:i1"]);
  });

  it("dedupes a match shared by two selected teams", async () => {
    const shared = cricketEvent("c-shared", daysFromNow(1));
    mockCricket.mockResolvedValue([shared]);
    const { result } = renderHook(
      () =>
        useCombinedSchedule(
          { teamIds: ["6", "8"], leagues: [], formats: [] },
          false
        ),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries).toHaveLength(1);
    expect(mockCricket).toHaveBeenCalledTimes(2);
  });

  it("hides past events unless showPastEvents", async () => {
    mockCricket.mockResolvedValue([
      cricketEvent("past", daysFromNow(-2)),
      cricketEvent("future", daysFromNow(2)),
    ]);
    const selection = { teamIds: ["6"], leagues: [], formats: [] };
    const { result } = renderHook(
      ({ showPast }) => useCombinedSchedule(selection, showPast),
      { wrapper, initialProps: { showPast: false } }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.entries.map(e => e.event.id)).toEqual(["future"]);
  });

  it("surfaces a failed source while the rest still renders", async () => {
    mockCricket.mockResolvedValue([cricketEvent("c1", daysFromNow(1))]);
    mockNba.mockRejectedValue(new Error("espn down"));
    const { result } = renderHook(
      () =>
        useCombinedSchedule(
          { teamIds: ["6"], leagues: ["nba"], formats: [] },
          false
        ),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.failedSources).toEqual(["NBA"]));
    expect(result.current.entries.map(e => e.event.id)).toEqual(["c1"]);
  });
});
