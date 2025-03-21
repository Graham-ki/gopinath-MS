﻿export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      inventory: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          quantity: number
          supplier_id: string | null
          unit_price: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          quantity?: number
          supplier_id?: string | null
          unit_price?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          quantity?: number
          supplier_id?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      proofs: {
        Row: {
          created_at: string
          id: number
          proof_url: string | null
          vehicle: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          proof_url?: string | null
          vehicle?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          proof_url?: string | null
          vehicle?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          customer_name: string
          id: number
          item_id: string | null
          quantity: number
          sale_date: string | null
        }
        Insert: {
          customer_name: string
          id?: number
          item_id?: string | null
          quantity: number
          sale_date?: string | null
        }
        Update: {
          customer_name?: string
          id?: number
          item_id?: string | null
          quantity?: number
          sale_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
        }
        Insert: {
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
        }
        Update: {
          contact?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          inventory_id: string | null
          quantity: number
          timestamp: string | null
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          id?: string
          inventory_id?: string | null
          quantity: number
          timestamp?: string | null
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          id?: string
          inventory_id?: string | null
          quantity?: number
          timestamp?: string | null
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_comments: {
        Row: {
          comment: string | null
          created_at: string
          id: number
          image_url: string | null
          vehicle_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: number
          image_url?: string | null
          vehicle_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: number
          image_url?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
          usertype: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role: string
          usertype?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
          usertype?: string | null
        }
        Relationships: []
      }
      vehicle_tracking: {
        Row: {
          arrival_time: string | null
          comment: string | null
          confirmation_status: boolean | null
          departure_time: string
          destination: string
          fuel_used: number | null
          id: string
          mileage: string | null
          route: string
          vehicle_number: string
        }
        Insert: {
          arrival_time?: string | null
          comment?: string | null
          confirmation_status?: boolean | null
          departure_time: string
          destination: string
          fuel_used?: number | null
          id?: string
          mileage?: string | null
          route: string
          vehicle_number: string
        }
        Update: {
          arrival_time?: string | null
          comment?: string | null
          confirmation_status?: boolean | null
          departure_time?: string
          destination?: string
          fuel_used?: number | null
          id?: string
          mileage?: string | null
          route?: string
          vehicle_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
