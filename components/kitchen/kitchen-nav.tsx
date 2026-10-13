"use client";

import {
  LayoutDashboard,
  PlusCircle,
  ClipboardCheck,
  PackagePlus,
  Calendar,
  BarChart3,
} from "lucide-react";
import { PortalHeader, type PortalNavItem } from "@/components/shared/portal-header";

export interface KitchenNavProps {
  kitchenName?: string;
  userEmail?: string;
  userFullName?: string;
  role?: string;
}

export function KitchenNav({ kitchenName, userEmail, userFullName, role }: KitchenNavProps) {
  const navItems: PortalNavItem[] = [
    { label: "Operations Hub", href: "/kitchen", icon: LayoutDashboard },
    { label: "Plan Meal", href: "/kitchen/meals/new", icon: PlusCircle },
    { label: "Audit Consumption", href: "/kitchen/consumption", icon: ClipboardCheck },
    { label: "Surplus Hub", href: "/kitchen/surplus", icon: PackagePlus },
    { label: "Pickups", href: "/kitchen/pickups", icon: Calendar },
    { label: "Analytics", href: "/kitchen/analytics", icon: BarChart3 },
  ];

  return (
    <PortalHeader
      portalType="kitchen"
      portalTitle="Kitchen Portal"
      facilityName={kitchenName || "Green Valley Main Kitchen"}
      navItems={navItems}
      userEmail={userEmail}
      userFullName={userFullName}
      userRole={role}
      showUserHubLink={true}
    />
  );
}
