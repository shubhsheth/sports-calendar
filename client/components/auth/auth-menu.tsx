import { CalendarDays, LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/auth/sign-in-dialog";
import { useAuth } from "@/hooks/useAuth";

/**
 * Header auth control: a Sign in button (opening the sign-in dialog) when
 * signed out, or the user's email + sign-out when signed in. Renders nothing
 * while the initial session loads or when Supabase isn't configured.
 */
export function AuthMenu() {
  const { enabled, loading, user, signOut } = useAuth();

  if (!enabled || loading) return null;

  if (user) {
    return (
      <div className="flex items-center gap-2 justify-self-end">
        <Button variant="secondary" size="sm" asChild>
          <Link to="/my-calendar">
            <CalendarDays />
            <span className="hidden sm:inline">My Calendar</span>
          </Link>
        </Button>
        <span className="text-sm text-gray-300 hidden sm:inline truncate max-w-48">
          {user.email}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void signOut()}
          aria-label="Sign out"
        >
          <LogOut />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    );
  }

  return (
    <SignInDialog
      trigger={
        <Button variant="secondary" size="sm" className="justify-self-end">
          Sign in
        </Button>
      }
    />
  );
}
