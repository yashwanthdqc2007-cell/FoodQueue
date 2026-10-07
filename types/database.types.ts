export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "kitchen" | "receiver" | "admin";
export type OrganizationType = "kitchen" | "receiver" | "institution" | "ngo" | "processing_unit";
export type MealPeriod = "breakfast" | "lunch" | "dinner" | "snack" | "other";
export type SurplusStatus = "active" | "matched" | "pickup_pending" | "picked_up" | "expired" | "recovered" | "disposed";
export type SurplusCategory = "edible_surplus" | "reusable" | "organic" | "unsafe" | "unknown";
export type WasteType = "cooking_loss" | "plate_waste" | "surplus" | "spoiled" | "organic" | "other";
export type ReceiverType = "ngo" | "shelter" | "hostel" | "community_center" | "other";
export type MatchStatus = "recommended" | "accepted" | "rejected" | "expired";
export type PickupStatus = "requested" | "scheduled" | "picked_up" | "cancelled";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          organization_type: OrganizationType;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          contact_phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          organization_type: OrganizationType;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          contact_phone?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          organization_type?: OrganizationType;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          contact_phone?: string | null;
          created_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          role: AppRole;
          organization_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          role?: AppRole;
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          role?: AppRole;
          organization_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      kitchens: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          timezone: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          timezone?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          timezone?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      meals: {
        Row: {
          id: string;
          kitchen_id: string;
          meal_name: string;
          meal_date: string;
          meal_period: MealPeriod;
          expected_consumers: number;
          planned_quantity: number;
          unit: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          kitchen_id: string;
          meal_name: string;
          meal_date: string;
          meal_period: MealPeriod;
          expected_consumers: number;
          planned_quantity: number;
          unit?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          kitchen_id?: string;
          meal_name?: string;
          meal_date?: string;
          meal_period?: MealPeriod;
          expected_consumers?: number;
          planned_quantity?: number;
          unit?: string;
          created_at?: string;
        };
      };
      consumption_records: {
        Row: {
          id: string;
          meal_id: string;
          actual_consumers: number;
          prepared_quantity: number;
          consumed_quantity: number;
          leftover_quantity: number;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          meal_id: string;
          actual_consumers: number;
          prepared_quantity: number;
          consumed_quantity: number;
          leftover_quantity: number;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          meal_id?: string;
          actual_consumers?: number;
          prepared_quantity?: number;
          consumed_quantity?: number;
          leftover_quantity?: number;
          recorded_at?: string;
        };
      };
      demand_predictions: {
        Row: {
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
        };
        Insert: {
          id?: string;
          kitchen_id: string;
          prediction_date: string;
          meal_period: MealPeriod;
          predicted_consumers: number;
          recommended_quantity: number;
          predicted_surplus?: number;
          confidence?: number | null;
          model_version?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          kitchen_id?: string;
          prediction_date?: string;
          meal_period?: MealPeriod;
          predicted_consumers?: number;
          recommended_quantity?: number;
          predicted_surplus?: number;
          confidence?: number | null;
          model_version?: string;
          created_at?: string;
        };
      };
      surplus_items: {
        Row: {
          id: string;
          kitchen_id: string;
          source_meal_id: string | null;
          food_name: string;
          quantity: number;
          unit: string;
          prepared_at: string | null;
          reported_at: string;
          redistribution_deadline: string | null;
          status: SurplusStatus;
          category: SurplusCategory;
          ai_confidence: number | null;
          image_path: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          kitchen_id: string;
          source_meal_id?: string | null;
          food_name: string;
          quantity: number;
          unit?: string;
          prepared_at?: string | null;
          reported_at?: string;
          redistribution_deadline?: string | null;
          status?: SurplusStatus;
          category?: SurplusCategory;
          ai_confidence?: number | null;
          image_path?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          kitchen_id?: string;
          source_meal_id?: string | null;
          food_name?: string;
          quantity?: number;
          unit?: string;
          prepared_at?: string | null;
          reported_at?: string;
          redistribution_deadline?: string | null;
          status?: SurplusStatus;
          category?: SurplusCategory;
          ai_confidence?: number | null;
          image_path?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      waste_records: {
        Row: {
          id: string;
          kitchen_id: string;
          food_name: string;
          quantity: number;
          unit: string;
          waste_type: WasteType;
          reason: string | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          kitchen_id: string;
          food_name: string;
          quantity: number;
          unit?: string;
          waste_type: WasteType;
          reason?: string | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          kitchen_id?: string;
          food_name?: string;
          quantity?: number;
          unit?: string;
          waste_type?: WasteType;
          reason?: string | null;
          recorded_at?: string;
        };
      };
      receivers: {
        Row: {
          id: string;
          organization_id: string;
          receiver_type: ReceiverType;
          max_capacity: number;
          accepted_food_types: Json;
          operating_hours: Json;
          priority_level: number;
          verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          receiver_type: ReceiverType;
          max_capacity: number;
          accepted_food_types?: Json;
          operating_hours?: Json;
          priority_level?: number;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          receiver_type?: ReceiverType;
          max_capacity?: number;
          accepted_food_types?: Json;
          operating_hours?: Json;
          priority_level?: number;
          verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      redistribution_matches: {
        Row: {
          id: string;
          surplus_id: string;
          receiver_id: string;
          match_score: number;
          match_reason: Json;
          status: MatchStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          surplus_id: string;
          receiver_id: string;
          match_score: number;
          match_reason?: Json;
          status?: MatchStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          surplus_id?: string;
          receiver_id?: string;
          match_score?: number;
          match_reason?: Json;
          status?: MatchStatus;
          created_at?: string;
        };
      };
      pickup_requests: {
        Row: {
          id: string;
          surplus_id: string;
          receiver_id: string;
          requested_at: string;
          scheduled_at: string | null;
          picked_up_at: string | null;
          status: PickupStatus;
          proof_image_path: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          surplus_id: string;
          receiver_id: string;
          requested_at?: string;
          scheduled_at?: string | null;
          picked_up_at?: string | null;
          status?: PickupStatus;
          proof_image_path?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          surplus_id?: string;
          receiver_id?: string;
          requested_at?: string;
          scheduled_at?: string | null;
          picked_up_at?: string | null;
          status?: PickupStatus;
          proof_image_path?: string | null;
          notes?: string | null;
        };
      };
      impact_records: {
        Row: {
          id: string;
          surplus_id: string;
          food_saved_quantity: number;
          estimated_meals_saved: number;
          estimated_waste_diverted: number;
          estimated_co2e_avoided: number | null;
          estimated_value_saved: number | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          surplus_id: string;
          food_saved_quantity: number;
          estimated_meals_saved?: number;
          estimated_waste_diverted?: number;
          estimated_co2e_avoided?: number | null;
          estimated_value_saved?: number | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          surplus_id?: string;
          food_saved_quantity?: number;
          estimated_meals_saved?: number;
          estimated_waste_diverted?: number;
          estimated_co2e_avoided?: number | null;
          estimated_value_saved?: number | null;
          recorded_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          notification_type: string;
          title: string;
          message: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          notification_type: string;
          title: string;
          message: string;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          notification_type?: string;
          title?: string;
          message?: string;
          read?: boolean;
          created_at?: string;
        };
      };
    };
    Enums: {
      app_role: AppRole;
      organization_type: OrganizationType;
      meal_period: MealPeriod;
      surplus_status: SurplusStatus;
      surplus_category: SurplusCategory;
      waste_type: WasteType;
      receiver_type: ReceiverType;
      match_status: MatchStatus;
      pickup_status: PickupStatus;
    };
  };
}
