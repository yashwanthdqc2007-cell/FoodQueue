"use client";

import { Sparkles, CheckCircle2, Clock, BarChart3 } from "lucide-react";
import { PortalHeader, type PortalNavItem } from "@/components/shared/portal-header";

export interface ReceiverNavProps {
  receiverName?: string;
  userEmail?: string;
  userFullName?: string;
  role?: string;
}

export function ReceiverNav({ receiverName, userEmail, userFullName, role }: ReceiverNavProps) {
  const navItems: PortalNavItem[] = [
    { label: "Food Marketplace", href: "/receiver", icon: Sparkles },
    { label: "Accepted Matches", href: "/receiver/matches", icon: CheckCircle2 },
    { label: "Pickups", href: "/receiver/pickups", icon: Clock },
    { label: "Estimated Impact", href: "/receiver/impact", icon: BarChart3 },
  ];

  return (
    <PortalHeader
      portalType="receiver"
      portalTitle="Receiver Portal"
      facilityName={receiverName || "Hope Community Centre"}
      navItems={navItems}
      userEmail={userEmail}
      userFullName={userFullName}
      userRole={role}
      showUserHubLink={true}
    />
  );
}
