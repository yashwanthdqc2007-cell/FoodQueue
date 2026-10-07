import { z } from "zod";

// Schema for client-side / browser-accessible environment variables
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL").optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY cannot be empty").optional(),
  NEXT_PUBLIC_MAP_STYLE_URL: z.string().optional(),
});

// Schema for server-only environment variables
const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(1, "SUPABASE_SECRET_KEY cannot be empty").optional(),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY cannot be empty").optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates and retrieves client-safe environment variables.
 * Safe to use in browser client components and server components alike.
 */
export function getClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
  });

  if (!parsed.success) {
    console.error("Invalid client environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid client environment configuration.");
  }

  return parsed.data;
}

/**
 * Validates and retrieves server-only environment variables.
 * MUST NEVER be called or imported in client-side code.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() cannot be called from browser / client-side code.");
  }

  const parsed = serverEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  });

  if (!parsed.success) {
    console.error("Invalid server environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment configuration.");
  }

  return parsed.data;
}
