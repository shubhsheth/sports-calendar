import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export type AuthContextValue = {
  /** False when Firebase env vars are absent — account UI should hide. */
  enabled: boolean;
  /** True until the initial session has been read from storage. */
  loading: boolean;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
