import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Shared Supabase client, or `null` when the env vars are absent (dev/test
 * without secrets — account features hide and the rest of the app works
 * unchanged, mirroring how analytics no-ops without a PostHog key).
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;
