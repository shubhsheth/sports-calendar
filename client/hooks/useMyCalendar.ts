import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listCalendar,
  pinEvent,
  regenerateFeedToken,
  removeSubscription,
  unpinEvent,
  upsertSubscription,
  type League,
  type SubscriptionFilters,
} from "@/api/calendar/calendarApi";
import { useAuth } from "@/hooks/useAuth";

const MY_CALENDAR_KEY = ["my-calendar"];

/** The signed-in user's calendar; disabled (no fetch) while signed out. */
export function useMyCalendar() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...MY_CALENDAR_KEY, user?.id],
    queryFn: listCalendar,
    enabled: user !== null,
  });
}

function useInvalidateMyCalendar() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: MY_CALENDAR_KEY });
}

export function useUpsertSubscription() {
  const invalidate = useInvalidateMyCalendar();
  return useMutation({
    mutationFn: (args: { league: League; filters: SubscriptionFilters }) =>
      upsertSubscription(args.league, args.filters),
    onSuccess: invalidate,
  });
}

export function useRemoveSubscription() {
  const invalidate = useInvalidateMyCalendar();
  return useMutation({
    mutationFn: (args: { league: League }) => removeSubscription(args.league),
    onSuccess: invalidate,
  });
}

export function usePinEvent() {
  const invalidate = useInvalidateMyCalendar();
  return useMutation({
    mutationFn: (args: { league: League; espnEventId: string }) =>
      pinEvent(args.league, args.espnEventId),
    onSuccess: invalidate,
  });
}

export function useUnpinEvent() {
  const invalidate = useInvalidateMyCalendar();
  return useMutation({
    mutationFn: (args: { league: League; espnEventId: string }) =>
      unpinEvent(args.league, args.espnEventId),
    onSuccess: invalidate,
  });
}

export function useRegenerateFeedToken() {
  const invalidate = useInvalidateMyCalendar();
  return useMutation({
    mutationFn: regenerateFeedToken,
    onSuccess: invalidate,
  });
}
