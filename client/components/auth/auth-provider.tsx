import { useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AuthContext, type AuthContextValue } from "@/hooks/useAuth";

/** Where the email-link sign-in returns; the email is stashed here between
 * requesting the link and completing it on return. */
const EMAIL_STORAGE_KEY = "sports-calendar:magic-link-email";

/**
 * Where auth flows land after the round trip. Includes the Vite base path so it
 * works on GitHub Pages (`/sports-calendar/`) and at the domain root.
 */
function actionCodeSettings() {
  return {
    url: window.location.origin + import.meta.env.BASE_URL,
    handleCodeInApp: true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(auth !== null);

  useEffect(() => {
    if (!auth) return;

    // If the app was opened via an email sign-in link, complete the sign-in
    // (Firebase needs this done explicitly on the landing page — there's no
    // automatic URL-session detection). The email was stored when the link was
    // requested.
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const email = window.localStorage.getItem(EMAIL_STORAGE_KEY);
      if (email) {
        void signInWithEmailLink(auth, email, window.location.href)
          .catch(() => {})
          .finally(() => {
            window.localStorage.removeItem(EMAIL_STORAGE_KEY);
            // Strip the one-time sign-in params from the URL.
            window.history.replaceState(
              {},
              "",
              window.location.origin + window.location.pathname
            );
          });
      }
    }

    return onAuthStateChanged(auth, current => {
      setUser(current);
      setLoading(false);
    });
  }, []);

  const value: AuthContextValue = {
    enabled: auth !== null,
    loading,
    user,
    signInWithGoogle: async () => {
      if (!auth) return;
      await signInWithPopup(auth, new GoogleAuthProvider());
    },
    signInWithMagicLink: async (email: string) => {
      if (!auth) return { error: "Sign-in is not configured" };
      try {
        await sendSignInLinkToEmail(auth, email, actionCodeSettings());
        window.localStorage.setItem(EMAIL_STORAGE_KEY, email);
        return { error: null };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : "Failed to send link",
        };
      }
    },
    signOut: async () => {
      if (!auth) return;
      await firebaseSignOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
