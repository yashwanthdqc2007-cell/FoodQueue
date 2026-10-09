"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChefHat, Calendar, ClipboardCheck, ArrowLeft, PlusCircle, LayoutDashboard, PackagePlus } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";

interface KitchenNavProps {
  kitchenName?: string;
  userEmail?: string;
  role?: string;
}

export function KitchenNav({ kitchenName, userEmail, role }: KitchenNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/kitchen", icon: LayoutDashboard },
    { label: "Plan Meal", href: "/kitchen/meals/new", icon: PlusCircle },
    { label: "Audit Consumption", href: "/kitchen/consumption", icon: ClipboardCheck },
    { label: "Surplus Hub", href: "/kitchen/surplus", icon: PackagePlus },
    { label: "Pickups", href: "/kitchen/pickups", icon: Calendar },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Kitchen Title */}
          <div className="flex items-center gap-4">
            <Link href="/kitchen" className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
                <ChefHat className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 tracking-tight">FoodQueue</span>
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Kitchen Portal
                </span>
              </div>
            </Link>

            {kitchenName && (
              <div className="hidden md:flex items-center text-xs font-medium text-slate-500 border-l border-slate-200 pl-4">
                <span>{kitchenName}</span>
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
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
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
              <div className="text-[10px] text-emerald-600 font-medium capitalize">{role || "kitchen"} Staff</div>
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
