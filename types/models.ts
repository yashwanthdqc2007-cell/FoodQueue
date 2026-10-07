import type { AppRole, OrganizationType } from "./database.types";

export interface OrganizationModel {
  id: string;
  name: string;
  organization_type: OrganizationType;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contact_phone?: string | null;
  created_at?: string;
}

export interface ProfileModel {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: AppRole;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  organizations?: OrganizationModel | null;
}

export interface UserProfileResponse {
  user: {
    id: string;
    email?: string | null;
    fullName: string;
  };
  profile: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    role: AppRole;
    organizationId: string | null;
    status: "assigned" | "pending_organization_assignment";
    organization: OrganizationModel | null;
    createdAt: string;
    updatedAt: string;
  };
}

export interface AdminUserListItem {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: AppRole;
  organizationId: string | null;
  organizationName: string | null;
  organizationType: OrganizationType | null;
  status: "assigned" | "pending_organization_assignment";
  createdAt: string;
  updatedAt: string;
}
