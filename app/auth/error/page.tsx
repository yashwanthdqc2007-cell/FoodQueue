"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { FoodQueueLogo } from "@/components/brand/foodqueue-logo";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "unknown_error";

  const errorMessages: Record<string, { title: string; description: string }> = {
    invalid_token: {
      title: "Invalid or Expired Link",
      description: "The authentication or email confirmation link is invalid, expired, or has already been used.",
    },
    access_denied: {
      title: "Access Denied",
      description: "You do not have permission to access this resource.",
    },
    unknown_error: {
      title: "Authentication Error",
      description: "An unexpected error occurred during the authentication process.",
    },
  };

  const errorInfo = errorMessages[code] || errorMessages.unknown_error;

  return (
    <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-3xl shadow-xl p-6 sm:p-8 text-center">
      <div className="flex items-center justify-center mb-6">
        <FoodQueueLogo href="/" variant="full" width={160} height={53} priority />
      </div>

      <div className="w-12 h-12 rounded-full bg-brand-red/15 text-brand-red border border-brand-red/30 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h1 className="text-xl font-bold text-brand-text mb-2">{errorInfo.title}</h1>
      <p className="text-sm text-brand-muted mb-6 leading-relaxed">{errorInfo.description}</p>

      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-brand-bg font-bold text-sm transition shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Sign In</span>
      </Link>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-brand-bg">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-2xl p-8 text-center text-brand-muted text-sm">
            Loading error details...
          </div>
        }
      >
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
