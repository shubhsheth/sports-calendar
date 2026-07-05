import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PinEventButton from "./pin-event-button";
import { useAuth } from "@/hooks/useAuth";
import {
  useMyCalendar,
  usePinEvent,
  useUnpinEvent,
} from "@/hooks/useMyCalendar";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useMyCalendar", () => ({
  useMyCalendar: vi.fn(),
  usePinEvent: vi.fn(),
  useUnpinEvent: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);
const mockUseMyCalendar = vi.mocked(useMyCalendar);
const mockUsePinEvent = vi.mocked(usePinEvent);
const mockUseUnpinEvent = vi.mocked(useUnpinEvent);

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

function calendarWith(pinnedEvents: { league: string; espnEventId: string }[]) {
  return {
    data: { id: "cal-1", feedToken: "t", subscriptions: [], pinnedEvents },
  } as ReturnType<typeof useMyCalendar>;
}

const pinMutate = vi.fn();
const unpinMutate = vi.fn();

beforeEach(() => {
  pinMutate.mockClear();
  unpinMutate.mockClear();
  mockUseAuth.mockReturnValue(signedIn());
  mockUseMyCalendar.mockReturnValue(calendarWith([]));
  mockUsePinEvent.mockReturnValue({
    mutate: pinMutate,
    isPending: false,
  } as unknown as ReturnType<typeof usePinEvent>);
  mockUseUnpinEvent.mockReturnValue({
    mutate: unpinMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useUnpinEvent>);
});

describe("PinEventButton", () => {
  it("renders nothing when accounts are not configured", () => {
    mockUseAuth.mockReturnValue(signedIn({ enabled: false }));
    const { container } = render(
      <PinEventButton league="nba" espnEventId="401" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("prompts sign-in when signed out", () => {
    mockUseAuth.mockReturnValue(signedIn({ user: null }));
    render(<PinEventButton league="nba" espnEventId="401" />);

    fireEvent.click(
      screen.getByRole("button", { name: /pin to my calendar/i })
    );
    expect(pinMutate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
  });

  it("pins when not pinned", () => {
    render(<PinEventButton league="ipl" espnEventId="701" />);

    const button = screen.getByRole("button", {
      name: /pin to my calendar/i,
    });
    expect(button).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(button);
    expect(pinMutate).toHaveBeenCalledWith(
      { league: "ipl", espnEventId: "701" },
      expect.anything()
    );
    expect(unpinMutate).not.toHaveBeenCalled();
  });

  it("unpins when already pinned", () => {
    mockUseMyCalendar.mockReturnValue(
      calendarWith([{ league: "ipl", espnEventId: "701" }])
    );
    render(<PinEventButton league="ipl" espnEventId="701" />);

    const button = screen.getByRole("button", {
      name: /unpin from my calendar/i,
    });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(unpinMutate).toHaveBeenCalledWith(
      { league: "ipl", espnEventId: "701" },
      expect.anything()
    );
    expect(pinMutate).not.toHaveBeenCalled();
  });
});
