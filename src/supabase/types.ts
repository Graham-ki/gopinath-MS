export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number | null
          created_at: string
          id: number
          item: string | null
          spent_by: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: number
          item?: string | null
          spent_by?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: number
          item?: string | null
          spent_by?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          id: number
          item: string | null
          quantity: number | null
          status: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          item?: string | null
          quantity?: number | null
          status?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          item?: string | null
          quantity?: number | null
          status?: string | null
          total_amount?: number | null
        }
        Relationships: []
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
      purchase_lpo: {
        Row: {
          amount: number | null
          created_at: string
          id: number
          lpo_number: string | null
          status: string | null
          supplier_id: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          id?: number
          lpo_number?: string | null
          status?: string | null
          supplier_id?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          id?: number
          lpo_number?: string | null
          status?: string | null
          supplier_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_lpo_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          cost: string | null
          created_at: string
          grn_number: number | null
          id: number
          is_deleted: boolean | null
          lpo_id: number | null
          name: string | null
          quantity: string | null
          supplier_id: number | null
        }
        Insert: {
          cost?: string | null
          created_at?: string
          grn_number?: number | null
          id?: number
          is_deleted?: boolean | null
          lpo_id?: number | null
          name?: string | null
          quantity?: string | null
          supplier_id?: number | null
        }
        Update: {
          cost?: string | null
          created_at?: string
          grn_number?: number | null
          id?: number
          is_deleted?: boolean | null
          lpo_id?: number | null
          name?: string | null
          quantity?: string | null
          supplier_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_lpo_id_fkey"
            columns: ["lpo_id"]
            isOneToOne: false
            referencedRelation: "purchase_lpo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_out: {
        Row: {
          created_at: string
          id: number
          issuedby: string | null
          name: string | null
          quantity: string | null
          stock_id: number | null
          takenby: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          issuedby?: string | null
          name?: string | null
          quantity?: string | null
          stock_id?: number | null
          takenby?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          issuedby?: string | null
          name?: string | null
          quantity?: string | null
          stock_id?: number | null
          takenby?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact: string | null
          created_at: string
          email: string | null
          id: number
          name: string
        }
        Insert: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: number
          name: string
        }
        Update: {
          address?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          action: string | null
          created_at: string
          created_by: string | null
          details: string | null
          id: number
        }
        Insert: {
          action?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: number
        }
        Update: {
          action?: string | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: number
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
          user_name: string | null
          usertype: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role: string
          user_name?: string | null
          usertype?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
          user_name?: string | null
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
          item: string | null
          mileage: number | null
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
          item?: string | null
          mileage?: number | null
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
          item?: string | null
          mileage?: number | null
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
