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
        Relationships: [];
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
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "kitchens_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "meals_kitchen_id_fkey";
            columns: ["kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "consumption_records_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "demand_predictions_kitchen_id_fkey";
            columns: ["kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "surplus_items_kitchen_id_fkey";
            columns: ["kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "surplus_items_source_meal_id_fkey";
            columns: ["source_meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "waste_records_kitchen_id_fkey";
            columns: ["kitchen_id"];
            isOneToOne: false;
            referencedRelation: "kitchens";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "receivers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "redistribution_matches_surplus_id_fkey";
            columns: ["surplus_id"];
            isOneToOne: false;
            referencedRelation: "surplus_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "redistribution_matches_receiver_id_fkey";
            columns: ["receiver_id"];
            isOneToOne: false;
            referencedRelation: "receivers";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "pickup_requests_surplus_id_fkey";
            columns: ["surplus_id"];
            isOneToOne: false;
            referencedRelation: "surplus_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pickup_requests_receiver_id_fkey";
            columns: ["receiver_id"];
            isOneToOne: false;
            referencedRelation: "receivers";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "impact_records_surplus_id_fkey";
            columns: ["surplus_id"];
            isOneToOne: false;
            referencedRelation: "surplus_items";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
    CompositeTypes: Record<string, never>;
  };
}
