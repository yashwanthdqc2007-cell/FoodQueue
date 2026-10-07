import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getServerEnv } from "@/lib/env";

/**
 * Creates a privileged admin Supabase client using SUPABASE_SECRET_KEY.
 * STRICTLY SERVER-ONLY: Never import into client components or expose to browser.
 * Used exclusively for administrative workflows (e.g., admin role/org provisioning).
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient cannot be called or imported on the client side.");
  }

  const env = getServerEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const secretKey = env.SUPABASE_SECRET_KEY || "";

  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is missing. Privileged admin operations cannot be performed.");
  }

  return createSupabaseClient<Database>(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
