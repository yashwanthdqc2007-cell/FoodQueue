"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";

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
    <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h1 className="text-xl font-bold text-slate-900 mb-2">{errorInfo.title}</h1>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">{errorInfo.description}</p>

      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Sign In</span>
      </Link>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center text-slate-500 text-sm">
            Loading error details...
          </div>
        }
      >
        <AuthErrorContent />
      </Suspense>
    </div>
  );
}
