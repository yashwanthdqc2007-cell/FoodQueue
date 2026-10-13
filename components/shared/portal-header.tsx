"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  Menu,
  X,
  LogOut,
  ArrowLeft,
  Shield,
  ChefHat,
  Building2,
  LayoutDashboard,
} from "lucide-react";
import { FoodQueueLogo } from "@/components/brand/foodqueue-logo";
import { logoutAction } from "@/app/auth/actions";

export interface PortalNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export type PortalType = "kitchen" | "receiver" | "admin" | "hub";

export interface PortalHeaderProps {
  portalType: PortalType;
  portalTitle?: string;
  facilityName?: string | null;
  navItems: PortalNavItem[];
  userEmail?: string | null;
  userFullName?: string | null;
  userRole?: string | null;
  showUserHubLink?: boolean;
}

export function PortalHeader({
  portalType,
  portalTitle,
  facilityName,
  navItems,
  userEmail,
  userFullName,
  userRole,
  showUserHubLink = true,
}: PortalHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = userRole === "admin";
  const displayName = userFullName || userEmail || "User";

  // Portal metadata, colors, and badge styling
  const portalMeta = {
    kitchen: {
      badgeText: portalTitle || "Kitchen Portal",
      badgeClass: "bg-brand-primary-light text-brand-primary border-brand-primary/30",
      activeNavClass: "bg-brand-primary text-brand-forest-dark font-black shadow-xs",
      activeIconClass: "text-brand-forest-dark",
      inactiveNavClass: "text-brand-muted hover:text-brand-text hover:bg-brand-card",
      homeHref: "/kitchen",
      facilityIcon: ChefHat,
      portalAccent: "text-brand-primary",
    },
    receiver: {
      badgeText: portalTitle || "Receiver Portal",
      badgeClass: "bg-brand-violet-light text-brand-violet border-brand-violet/30",
      activeNavClass: "bg-brand-violet text-white font-black shadow-xs",
      activeIconClass: "text-white",
      inactiveNavClass: "text-brand-muted hover:text-brand-text hover:bg-brand-card",
      homeHref: "/receiver",
      facilityIcon: Building2,
      portalAccent: "text-brand-violet",
    },
    admin: {
      badgeText: portalTitle || "Admin Console",
      badgeClass: "bg-brand-primary/20 text-brand-mint border-brand-primary/30",
      activeNavClass: "bg-brand-primary text-white font-black shadow-xs",
      activeIconClass: "text-white",
      inactiveNavClass: "text-brand-muted hover:text-brand-text hover:bg-brand-card",
      homeHref: "/admin",
      facilityIcon: Shield,
      portalAccent: "text-brand-mint",
    },
    hub: {
      badgeText: portalTitle || "Workspace Hub",
      badgeClass: "bg-brand-card text-brand-muted border-brand-border",
      activeNavClass: "bg-brand-card text-brand-text font-bold shadow-xs border border-brand-border",
      activeIconClass: "text-brand-primary",
      inactiveNavClass: "text-brand-muted hover:text-brand-text hover:bg-brand-card",
      homeHref: "/dashboard",
      facilityIcon: LayoutDashboard,
      portalAccent: "text-brand-text",
    },
  }[portalType];

  const FacilityIcon = portalMeta.facilityIcon;

  // Accurate role display badge
  function renderRoleBadge() {
    if (isAdmin) {
      if (portalType === "kitchen") {
        return (
          <span className="text-[10px] text-brand-mint font-bold uppercase tracking-wider">
            Super Admin <span className="opacity-70 font-normal">· Inspecting</span>
          </span>
        );
      }
      if (portalType === "receiver") {
        return (
          <span className="text-[10px] text-brand-violet font-bold uppercase tracking-wider">
            Super Admin <span className="opacity-70 font-normal">· Inspecting</span>
          </span>
        );
      }
      return (
        <span className="text-[10px] text-brand-mint font-bold uppercase tracking-wider">
          Super Administrator
        </span>
      );
    }

    if (userRole === "kitchen") {
      return (
        <span className="text-[10px] text-brand-primary font-bold uppercase tracking-wider">
          Kitchen Staff
        </span>
      );
    }

    if (userRole === "receiver") {
      return (
        <span className="text-[10px] text-brand-violet font-bold uppercase tracking-wider">
          Community Partner
        </span>
      );
    }

    return (
      <span className="text-[10px] text-brand-muted font-bold uppercase tracking-wider">
        {userRole || "User"}
      </span>
    );
  }

  // Sidebar Inner Content (Shared between desktop aside and mobile drawer)
  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full select-none">
      {/* 1. Brand Logo & Portal Context */}
      <div className="p-5 pb-4 border-b border-brand-border/70 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <FoodQueueLogo href={portalMeta.homeHref} variant="full" width={175} height={46} priority />
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-card border border-brand-border"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={clsx(
              "text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full border tracking-wide uppercase",
              portalMeta.badgeClass
            )}
          >
            {portalMeta.badgeText}
          </span>
          {isAdmin && portalType !== "admin" && (
            <span className="text-[10px] font-semibold text-brand-mint/90 bg-brand-primary/10 border border-brand-primary/20 px-2 py-0.5 rounded-full">
              Inspection Mode
            </span>
          )}
        </div>
      </div>

      {/* 2. Facility / Workspace Context Card */}
      {facilityName && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <div className="p-2.5 rounded-2xl bg-brand-card/70 border border-brand-border/70 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center shrink-0">
              <FacilityIcon className={clsx("w-4 h-4", portalMeta.portalAccent)} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9.5px] font-extrabold text-brand-muted uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                Active Workspace
              </div>
              <div className="text-xs font-bold text-brand-text truncate" title={facilityName}>
                {facilityName}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Navigation Items */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-1">
        <div className="text-[10px] font-extrabold text-brand-muted uppercase tracking-wider px-3 mb-1.5">
          Menu
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => isMobile && setMobileMenuOpen(false)}
              className={clsx(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition",
                isActive ? portalMeta.activeNavClass : portalMeta.inactiveNavClass
              )}
            >
              <Icon
                className={clsx(
                  "w-4 h-4 shrink-0",
                  isActive ? portalMeta.activeIconClass : "text-brand-muted"
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Shortcuts / Cross Navigation */}
        {(showUserHubLink || (isAdmin && portalType !== "admin")) && (
          <div className="pt-4 mt-3 border-t border-brand-border/60 space-y-1">
            <div className="text-[10px] font-extrabold text-brand-muted uppercase tracking-wider px-3 mb-1.5">
              Shortcuts
            </div>

            {isAdmin && portalType !== "admin" && (
              <Link
                href="/admin"
                onClick={() => isMobile && setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-brand-mint bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 transition"
              >
                <Shield className="w-4 h-4 shrink-0 text-brand-mint" />
                <span className="truncate">Admin Console</span>
              </Link>
            )}

            {showUserHubLink && (
              <Link
                href="/dashboard"
                onClick={() => isMobile && setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-brand-muted hover:text-brand-text hover:bg-brand-card transition"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="truncate">Workspace Hub</span>
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* 4. Bottom Authenticated User Identity & Sign Out */}
      <div className="p-3.5 border-t border-brand-border/80 bg-brand-surface/90 flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 px-1">
          <div className="w-8 h-8 rounded-full bg-brand-primary/20 border border-brand-primary/40 text-brand-mint flex items-center justify-center font-black text-xs shrink-0">
            {(displayName[0] || "U").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-brand-text truncate" title={userEmail || displayName}>
              {displayName}
            </div>
            <div className="truncate">{renderRoleBadge()}</div>
          </div>
        </div>

        <form action={logoutAction} className="w-full">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-brand-border bg-brand-card hover:bg-brand-surface hover:border-brand-red/40 hover:text-brand-red text-xs font-bold text-brand-muted transition shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* A. DESKTOP PERMANENT LEFT SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 shrink-0 bg-brand-surface/95 backdrop-blur-md border-r border-brand-border z-30 shadow-lg">
        {renderSidebarContent(false)}
      </aside>

      {/* B. MOBILE COMPACT TOP BAR */}
      <header className="md:hidden sticky top-0 z-40 bg-brand-surface/95 backdrop-blur-md border-b border-brand-border shadow-md text-brand-text w-full">
        <div className="px-4 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <FoodQueueLogo href={portalMeta.homeHref} variant="full" width={145} height={38} priority />
            <span
              className={clsx(
                "text-[10px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0",
                portalMeta.badgeClass
              )}
            >
              {portalMeta.badgeText}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl text-brand-muted hover:text-brand-text hover:bg-brand-card border border-brand-border shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* C. MOBILE SLIDE-OUT DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Pane */}
          <div className="relative w-72 max-w-[85vw] h-full bg-brand-surface border-r border-brand-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}

// Alias for semantic clarity
export const PortalSidebar = PortalHeader;
