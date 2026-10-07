import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database.types";
import { getClientEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const env = getClientEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabasePublishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

  if (!supabaseUrl || !supabasePublishableKey) {
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as CookieOptions)
        );
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}
