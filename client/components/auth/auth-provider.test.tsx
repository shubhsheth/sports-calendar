import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const authFns = vi.hoisted(() => ({
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  sendSignInLinkToEmail: vi.fn(),
  signInWithEmailLink: vi.fn(),
  isSignInWithEmailLink: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {},
  onAuthStateChanged: (auth: unknown, cb: (u: unknown) => void) =>
    authFns.onAuthStateChanged(auth, cb),
  signInWithPopup: (...args: unknown[]) => authFns.signInWithPopup(...args),
  sendSignInLinkToEmail: (...args: unknown[]) =>
    authFns.sendSignInLinkToEmail(...args),
  signInWithEmailLink: (...args: unknown[]) =>
    authFns.signInWithEmailLink(...args),
  isSignInWithEmailLink: (...args: unknown[]) =>
    authFns.isSignInWithEmailLink(...args),
  signOut: (...args: unknown[]) => authFns.signOut(...args),
}));

/** Load the provider + hook with a specific mock for the firebase auth singleton. */
async function loadAuth(mockAuth: unknown) {
  vi.resetModules();
  vi.doMock("@/lib/firebase", () => ({ auth: mockAuth, db: null }));
  const { AuthProvider } = await import("./auth-provider");
  const { useAuth } = await import("@/hooks/useAuth");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  return { useAuth, wrapper };
}

const BASE_REDIRECT = window.location.origin + import.meta.env.BASE_URL;

beforeEach(() => {
  window.localStorage.clear();
  authFns.onAuthStateChanged.mockReset();
  authFns.signInWithPopup.mockReset().mockResolvedValue(undefined);
  authFns.sendSignInLinkToEmail.mockReset().mockResolvedValue(undefined);
  authFns.signInWithEmailLink.mockReset().mockResolvedValue(undefined);
  authFns.isSignInWithEmailLink.mockReset().mockReturnValue(false);
  authFns.signOut.mockReset().mockResolvedValue(undefined);
  // Default: fire once with no user, so `loading` settles to false.
  authFns.onAuthStateChanged.mockImplementation(
    (_auth: unknown, cb: (u: unknown) => void) => {
      cb(null);
      return vi.fn();
    }
  );
});

afterEach(() => {
  vi.doUnmock("@/lib/firebase");
});

describe("AuthProvider / useAuth", () => {
  it("is disabled and errors on sign-in when firebase is not configured", async () => {
    const { useAuth, wrapper } = await loadAuth(null);
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.enabled).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBeNull();
    await expect(result.current.signInWithMagicLink("a@b.c")).resolves.toEqual({
      error: "Sign-in is not configured",
    });
  });

  it("loads the initial session and exposes the user", async () => {
    const unsubscribe = vi.fn();
    authFns.onAuthStateChanged.mockImplementation(
      (_auth: unknown, cb: (u: unknown) => void) => {
        cb({ email: "fan@example.com" });
        return unsubscribe;
      }
    );
    const { useAuth, wrapper } = await loadAuth({});
    const { result, unmount } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.enabled).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user?.email).toBe("fan@example.com");

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("starts Google sign-in via popup", async () => {
    const { useAuth, wrapper } = await loadAuth({});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await result.current.signInWithGoogle();
    expect(authFns.signInWithPopup).toHaveBeenCalled();
  });

  it("sends the magic link with a base-path-aware redirect and stores the email", async () => {
    const { useAuth, wrapper } = await loadAuth({});
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      result.current.signInWithMagicLink("fan@example.com")
    ).resolves.toEqual({ error: null });
    expect(authFns.sendSignInLinkToEmail).toHaveBeenCalledWith(
      {},
      "fan@example.com",
      { url: BASE_REDIRECT, handleCodeInApp: true }
    );
    expect(
      window.localStorage.getItem("sports-calendar:magic-link-email")
    ).toBe("fan@example.com");
  });

  it("completes an email-link sign-in on load when the URL is a sign-in link", async () => {
    authFns.isSignInWithEmailLink.mockReturnValue(true);
    window.localStorage.setItem(
      "sports-calendar:magic-link-email",
      "fan@example.com"
    );
    const { useAuth, wrapper } = await loadAuth({});
    renderHook(() => useAuth(), { wrapper });

    await waitFor(() =>
      expect(authFns.signInWithEmailLink).toHaveBeenCalledWith(
        {},
        "fan@example.com",
        window.location.href
      )
    );
  });

  it("delegates signOut to firebase", async () => {
    const { useAuth, wrapper } = await loadAuth({});
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.signOut();
    expect(authFns.signOut).toHaveBeenCalled();
  });
});
