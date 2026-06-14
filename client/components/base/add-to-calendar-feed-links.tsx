import { useState } from "react";
import { Apple, Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { analytics } from "@/lib/analytics";

type AddToCalendarFeedLinksProps = {
  league: string;
  feedUrl: string;
};

function AddToCalendarFeedLinks({
  league,
  feedUrl,
}: AddToCalendarFeedLinksProps) {
  const [copied, setCopied] = useState(false);

  if (!feedUrl.startsWith("http")) return null;

  const webcalUrl = feedUrl.replace(/^https:/, "webcal:");
  const googleCalendarUrl = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(feedUrl);
    analytics.calendarFeedUrlCopied(league);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Separator />
      <div className="px-5 pb-5 pt-2 flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Subscribe to a live feed that updates automatically.
        </p>
        <Button className="w-full" variant="outline" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="size-4" aria-hidden />
              Copied!
            </>
          ) : (
            <>
              <Copy className="size-4" aria-hidden />
              Copy calendar link
            </>
          )}
        </Button>
        <Button className="w-full" variant="outline" asChild>
          <a
            href={webcalUrl}
            onClick={() => analytics.calendarFeedAppleClicked(league)}
          >
            <Apple className="size-4" aria-hidden />
            Add to Apple Calendar
          </a>
        </Button>
        <Button className="w-full" variant="outline" asChild>
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => analytics.calendarFeedGoogleClicked(league)}
          >
            <ExternalLink className="size-4" aria-hidden />
            Add to Google Calendar
          </a>
        </Button>
      </div>
    </>
  );
}

export default AddToCalendarFeedLinks;
