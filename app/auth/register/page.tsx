"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, AlertCircle, Info } from "lucide-react";
import { registerAction } from "@/app/auth/actions";
import { FoodQueueLogo } from "@/components/brand/foodqueue-logo";

export default function RegisterPage() {
  const router = useRouter();
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
      const res = await registerAction(formData);
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
      console.error("Registration error:", err);
      setError("An unexpected error occurred during registration. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-bg">
      <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl shadow-xl p-6 sm:p-8 my-8">
        <div className="flex items-center justify-center mb-6">
          <FoodQueueLogo href="/" variant="full" width={180} height={60} priority />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-text">Create an account</h1>
          <p className="text-xs sm:text-sm text-brand-muted mt-1">Join the food intelligence &amp; rescue network</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-brand-red/10 border border-brand-red/25 text-brand-red text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-brand-red" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              placeholder="e.g. Chef Ramesh Kumar"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition bg-brand-card"
            />
            {fieldErrors.fullName && (
              <p className="text-xs text-brand-red mt-1">{fieldErrors.fullName[0]}</p>
            )}
          </div>

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
              Password (min 8 characters)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition bg-brand-card"
            />
            {fieldErrors.password && (
              <p className="text-xs text-brand-red mt-1">{fieldErrors.password[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-bold text-brand-muted uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-border text-sm text-brand-text placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition bg-brand-card"
            />
            {fieldErrors.confirmPassword && (
              <p className="text-xs text-brand-red mt-1">{fieldErrors.confirmPassword[0]}</p>
            )}
          </div>

          <div className="p-3.5 bg-brand-card/80 border border-brand-border rounded-xl text-xs text-brand-muted flex items-start gap-2.5">
            <Info className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
            <p>
              Your profile is registered with standard credentials. An administrator provisions your account to an authorized kitchen or receiver organization.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-bg font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Register Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-brand-muted border-t border-brand-border pt-4">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-bold text-brand-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
