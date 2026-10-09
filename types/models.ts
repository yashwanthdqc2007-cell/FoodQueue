import type {
  AppRole,
  OrganizationType,
  MealPeriod,
  SurplusStatus,
  SurplusCategory,
  ReceiverType,
  MatchStatus,
  PickupStatus,
} from "./database.types";

export type {
  AppRole,
  OrganizationType,
  MealPeriod,
  SurplusStatus,
  SurplusCategory,
  ReceiverType,
  MatchStatus,
  PickupStatus,
};

export interface OrganizationModel {
  id: string;
  name: string;
  organization_type: OrganizationType;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  contact_phone?: string | null;
  created_at: string;
}

export interface ProfileModel {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role: AppRole;
  organization_id?: string | null;
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

export interface MealModel {
  id: string;
  kitchen_id: string;
  meal_name: string;
  meal_date: string;
  meal_period: MealPeriod;
  expected_consumers: number;
  planned_quantity: number;
  unit: string;
  created_at: string;
  consumption_records?: ConsumptionRecordModel[] | null;
  surplus_items?: SurplusItemModel[] | null;
}

export interface ConsumptionRecordModel {
  id: string;
  meal_id: string;
  actual_consumers: number;
  prepared_quantity: number;
  consumed_quantity: number;
  leftover_quantity: number;
  recorded_at: string;
  meals?: MealModel | null;
}

export interface DemandPredictionModel {
  id: string;
  kitchen_id: string;
  prediction_date: string;
  meal_period: MealPeriod;
  predicted_consumers: number;
  recommended_quantity: number;
  predicted_surplus: number;
  confidence: number | null;
  model_version: string;
  created_at: string;
}

export interface SurplusItemModel {
  id: string;
  kitchen_id: string;
  source_meal_id?: string | null;
  food_name: string;
  quantity: number;
  unit: string;
  prepared_at?: string | null;
  reported_at: string;
  redistribution_deadline?: string | null;
  status: SurplusStatus;
  category: SurplusCategory;
  ai_confidence?: number | null;
  image_path?: string | null;
  notes?: string | null;
  created_at: string;
  kitchens?: KitchenModel | null;
  meals?: MealModel | null;
  redistribution_matches?: RedistributionMatchModel[] | null;
}

export interface KitchenModel {
  id: string;
  organization_id: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  organizations?: OrganizationModel | null;
}

export interface ReceiverModel {
  id: string;
  organization_id: string;
  receiver_type: ReceiverType;
  max_capacity: number;
  accepted_food_types: string[] | string;
  operating_hours: Record<string, string> | string;
  priority_level: number;
  verified: boolean;
  created_at: string;
  updated_at: string;
  organizations?: OrganizationModel | null;
}

export interface RedistributionMatchModel {
  id: string;
  surplus_id: string;
  receiver_id: string;
  match_score: number;
  match_reason: string[] | Record<string, unknown>;
  status: MatchStatus;
  created_at: string;
  surplus_items?: SurplusItemModel | null;
  receivers?: ReceiverModel | null;
}

export interface PickupRequestModel {
  id: string;
  surplus_id: string;
  receiver_id: string;
  requested_at: string;
  scheduled_at?: string | null;
  picked_up_at?: string | null;
  status: PickupStatus;
  proof_image_path?: string | null;
  notes?: string | null;
  surplus_items?: SurplusItemModel | null;
  receivers?: ReceiverModel | null;
}

export interface ImpactRecordModel {
  id: string;
  surplus_id: string;
  food_saved_quantity: number;
  estimated_meals_saved: number;
  estimated_waste_diverted: number;
  estimated_co2e_avoided?: number | null;
  estimated_value_saved?: number | null;
  recorded_at: string;
  surplus_items?: SurplusItemModel | null;
}

export interface NotificationModel {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

