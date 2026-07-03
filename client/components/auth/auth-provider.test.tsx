import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

/** Load the provider + hook with a specific mock for the supabase singleton. */
async function loadAuth(mockSupabase: unknown) {
  vi.resetModules();
  vi.doMock("@/lib/supabase", () => ({ supabase: mockSupabase }));
  const { AuthProvider } = await import("./auth-provider");
  const { useAuth } = await import("@/hooks/useAuth");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  return { useAuth, wrapper };
}

function fakeSupabase(user: { email: string } | null) {
  const unsubscribe = vi.fn();
  return {
    unsubscribe,
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: user ? { user } : null } }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe } } }),
      signInWithOAuth: vi.fn().mockResolvedValue({}),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({}),
    },
  };
}

afterEach(() => {
  vi.doUnmock("@/lib/supabase");
});

describe("AuthProvider / useAuth", () => {
  it("is disabled and errors on sign-in when supabase is not configured", async () => {
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
    const supabase = fakeSupabase({ email: "fan@example.com" });
    const { useAuth, wrapper } = await loadAuth(supabase);
    const { result, unmount } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.enabled).toBe(true);
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user?.email).toBe("fan@example.com");

    unmount();
    expect(supabase.unsubscribe).toHaveBeenCalled();
  });

  it("sends the magic link with a base-path-aware redirect", async () => {
    const supabase = fakeSupabase(null);
    const { useAuth, wrapper } = await loadAuth(supabase);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      result.current.signInWithMagicLink("fan@example.com")
    ).resolves.toEqual({ error: null });
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: "fan@example.com",
      options: {
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
  });

  it("delegates signOut to supabase", async () => {
    const supabase = fakeSupabase({ email: "fan@example.com" });
    const { useAuth, wrapper } = await loadAuth(supabase);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await result.current.signOut();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
