import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { getServerEnv } from "@/lib/env";

/**
 * Creates a server-side Supabase client for Server Components, Route Handlers, and Server Actions.
 * Preserves user authentication context via cookies and enforces Row Level Security (RLS).
 */
export async function createClient() {
  const cookieStore = await cookies();
  const env = getServerEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabasePublishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as CookieOptions)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
