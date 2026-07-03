import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  return <SignInDialog />;
}

function SignInDialog() {
  const { signInWithGoogle, signInWithMagicLink } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "sending" }
    | { state: "sent" }
    | { state: "error"; message: string }
  >({ state: "idle" });

  async function handleMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setStatus({ state: "sending" });
    const { error } = await signInWithMagicLink(email);
    setStatus(error ? { state: "error", message: error } : { state: "sent" });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={isOpen => {
        setOpen(isOpen);
        if (!isOpen) setStatus({ state: "idle" });
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="justify-self-end">
          Sign in
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>
            Save leagues and games to your own combined calendar.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={() => void signInWithGoogle()}>
          Continue with Google
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        {status.state === "sent" ? (
          <p className="text-sm" role="status">
            Check your email for a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleMagicLink} className="grid gap-2">
            <Label htmlFor="magic-link-email">Email</Label>
            <Input
              id="magic-link-email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={status.state === "sending"}
            >
              {status.state === "sending" ? "Sending…" : "Email me a link"}
            </Button>
            {status.state === "error" && (
              <p className="text-sm text-destructive" role="alert">
                {status.message}
              </p>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
