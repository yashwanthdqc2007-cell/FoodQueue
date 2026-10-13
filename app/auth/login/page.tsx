"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { loginAction } from "@/app/auth/actions";
import { FoodQueueLogo } from "@/components/brand/foodqueue-logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await loginAction(formData);
      if (res?.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
        return;
      }
      if (res && !res.success) {
        if (res.error) setError(res.error);
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
      }
    } catch (err: unknown) {
      if (
        (err as any)?.digest?.includes("NEXT_REDIRECT") ||
        (err instanceof Error && err.message.includes("NEXT_REDIRECT"))
      ) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl shadow-xl p-6 sm:p-8">
      <div className="flex items-center justify-center mb-6">
        <FoodQueueLogo href="/" variant="full" width={180} height={60} priority />
      </div>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-text">Sign in to your account</h1>
        <p className="text-xs sm:text-sm text-brand-muted mt-1">Access the surplus food recovery network</p>
      </div>

      {registered && (
        <div className="mb-5 p-3.5 rounded-xl bg-brand-forest/30 border border-brand-forest text-brand-mint text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-brand-primary" />
          <span>Account created successfully! Please sign in with your credentials.</span>
        </div>
      )}

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-brand-red/10 border border-brand-red/25 text-brand-red text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-brand-red" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@institution.org"
            className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition bg-brand-card"
          />
          {fieldErrors.email && (
            <p className="text-xs text-brand-red mt-1">{fieldErrors.email[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition bg-brand-card"
          />
          {fieldErrors.password && (
            <p className="text-xs text-brand-red mt-1">{fieldErrors.password[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-bg font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-xs text-brand-muted border-t border-brand-border pt-4">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="font-bold text-brand-primary hover:underline">
          Register here
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-bg">
      <Suspense fallback={<div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-2xl p-8 text-center text-brand-muted text-sm">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
