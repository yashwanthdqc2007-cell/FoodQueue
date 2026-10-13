"use client";

import { BarChart3, Building2, HeartHandshake, Users } from "lucide-react";
import { PortalHeader, type PortalNavItem } from "@/components/shared/portal-header";

export interface AdminNavProps {
  userEmail?: string | null;
  userFullName?: string | null;
  role?: string | null;
}

export function AdminNav({ userEmail, userFullName, role = "admin" }: AdminNavProps) {
  const navItems: PortalNavItem[] = [
    { label: "System Overview", href: "/admin", icon: BarChart3 },
    { label: "Organizations", href: "/admin/organizations", icon: Building2 },
    { label: "Receiver Verification", href: "/admin/receivers", icon: HeartHandshake },
    { label: "User Directory", href: "/admin/users", icon: Users },
  ];

  return (
    <PortalHeader
      portalType="admin"
      portalTitle="Admin Console"
      facilityName="Platform Governance"
      navItems={navItems}
      userEmail={userEmail}
      userFullName={userFullName}
      userRole={role || "admin"}
      showUserHubLink={true}
    />
  );
}
