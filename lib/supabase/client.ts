import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { getClientEnv } from "@/lib/env";

/**
 * Creates a Supabase client for use in browser client components.
 * Strictly uses the publishable key and is bounded by Row Level Security (RLS).
 */
export function createClient() {
  const env = getClientEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
