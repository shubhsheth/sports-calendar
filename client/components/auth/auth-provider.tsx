import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AuthContext, type AuthContextValue } from "@/hooks/useAuth";

/**
 * Where auth flows land after the round trip to Google / the magic link.
 * Includes the Vite base path so it works on GitHub Pages
 * (`/sports-calendar/`) and on localhost (`/`).
 */
function redirectUrl() {
  return window.location.origin + import.meta.env.BASE_URL;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(supabase !== null);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => subscription.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    enabled: supabase !== null,
    loading,
    user,
    signInWithGoogle: async () => {
      if (!supabase) return;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl() },
      });
    },
    signInWithMagicLink: async (email: string) => {
      if (!supabase) return { error: "Sign-in is not configured" };
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectUrl() },
      });
      return { error: error?.message ?? null };
    },
    signOut: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
