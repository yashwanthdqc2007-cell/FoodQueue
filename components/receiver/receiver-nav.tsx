"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartHandshake, Sparkles, CheckCircle2, ArrowLeft, LayoutDashboard, Clock } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";

interface ReceiverNavProps {
  receiverName?: string;
  userEmail?: string;
  role?: string;
}

export function ReceiverNav({ receiverName, userEmail, role }: ReceiverNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Surplus Opportunities", href: "/receiver", icon: Sparkles },
    { label: "Accepted Matches", href: "/receiver/matches", icon: CheckCircle2 },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Title */}
          <div className="flex items-center gap-4">
            <Link href="/receiver" className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 tracking-tight">FoodQueue</span>
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Receiver Portal
                </span>
              </div>
            </Link>

            {receiverName && (
              <div className="hidden md:flex items-center text-xs font-medium text-slate-500 border-l border-slate-200 pl-4">
                <span>{receiverName}</span>
              </div>
            )}
          </div>

          {/* Center Nav Links */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? "bg-purple-50 text-purple-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-purple-600" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right User Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden lg:inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Main Hub</span>
            </Link>

            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900">{userEmail}</div>
              <div className="text-[10px] text-purple-600 font-medium capitalize">{role || "receiver"} Partner</div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition shadow-xs"
              >
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
