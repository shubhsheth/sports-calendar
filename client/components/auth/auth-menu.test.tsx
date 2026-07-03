import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AuthMenu } from "./auth-menu";
import { useAuth } from "@/hooks/useAuth";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));

const mockUseAuth = vi.mocked(useAuth);

function authState(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    enabled: true,
    loading: false,
    user: null,
    signInWithGoogle: vi.fn(),
    signInWithMagicLink: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseAuth.mockReturnValue(authState());
});

describe("AuthMenu", () => {
  it("renders nothing when Supabase is not configured", () => {
    mockUseAuth.mockReturnValue(authState({ enabled: false }));
    const { container } = render(<AuthMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while the session is loading", () => {
    mockUseAuth.mockReturnValue(authState({ loading: true }));
    const { container } = render(<AuthMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the email and signs out when signed in", async () => {
    const state = authState({
      user: { email: "fan@example.com" } as ReturnType<typeof useAuth>["user"],
    });
    mockUseAuth.mockReturnValue(state);
    render(<AuthMenu />);

    expect(screen.getByText("fan@example.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(state.signOut).toHaveBeenCalled();
  });

  it("opens the sign-in dialog and starts Google sign-in", async () => {
    const state = authState();
    mockUseAuth.mockReturnValue(state);
    render(<AuthMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );
    expect(state.signInWithGoogle).toHaveBeenCalled();
  });

  it("sends a magic link and confirms it", async () => {
    const state = authState();
    mockUseAuth.mockReturnValue(state);
    render(<AuthMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fan@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /email me a link/i }));

    expect(state.signInWithMagicLink).toHaveBeenCalledWith("fan@example.com");
    expect(await screen.findByRole("status")).toHaveTextContent(
      /check your email/i
    );
  });

  it("shows the error when the magic link fails", async () => {
    const state = authState({
      signInWithMagicLink: vi
        .fn()
        .mockResolvedValue({ error: "Rate limit exceeded" }),
    });
    mockUseAuth.mockReturnValue(state);
    render(<AuthMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "fan@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /email me a link/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Rate limit exceeded"
    );
  });
});
