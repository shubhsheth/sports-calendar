import { useState, type ReactNode } from "react";
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
import { analytics } from "@/lib/analytics";

type SignInDialogProps = {
  /** Element that opens the dialog (rendered via Radix `asChild`). */
  trigger: ReactNode;
  description?: string;
};

/** Sign-in dialog (Google OAuth + magic-link email) behind any trigger. */
export function SignInDialog({
  trigger,
  description = "Save leagues and games to your own combined calendar.",
}: SignInDialogProps) {
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
    analytics.signInStarted("magic_link");
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Button
          onClick={() => {
            analytics.signInStarted("google");
            void signInWithGoogle();
          }}
        >
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
