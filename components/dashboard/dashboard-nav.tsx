"use client";

import { Shield, ChefHat, HeartHandshake } from "lucide-react";
import { PortalHeader, type PortalNavItem } from "@/components/shared/portal-header";

export interface DashboardNavProps {
  facilityName: string;
  userEmail?: string | null;
  userFullName?: string | null;
  userRole?: string | null;
  isAdmin: boolean;
  isAssigned: boolean;
  role: string;
}

export function DashboardNav({
  facilityName,
  userEmail,
  userFullName,
  userRole,
  isAdmin,
  isAssigned,
  role,
}: DashboardNavProps) {
  const navItems: PortalNavItem[] = isAdmin
    ? [
        { label: "Admin Console", href: "/admin", icon: Shield },
        { label: "Kitchen Operations", href: "/kitchen", icon: ChefHat },
        { label: "Receiver Portal", href: "/receiver", icon: HeartHandshake },
      ]
    : role === "receiver" && isAssigned
    ? [{ label: "Receiver Portal", href: "/receiver", icon: HeartHandshake }]
    : isAssigned
    ? [{ label: "Kitchen Portal", href: "/kitchen", icon: ChefHat }]
    : [];

  return (
    <PortalHeader
      portalType="hub"
      portalTitle="Workspace Hub"
      facilityName={facilityName}
      navItems={navItems}
      userEmail={userEmail}
      userFullName={userFullName}
      userRole={userRole}
      showUserHubLink={false}
    />
  );
}
