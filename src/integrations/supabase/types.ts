export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      acompanhamentos: {
        Row: {
          created_at: string
          display_order: number
          id: number
          name: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: number
          name: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: number
          name?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order: number
          type: string
          updated_at: string
          uses_count: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          type: string
          updated_at?: string
          uses_count?: number
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order?: number
          type?: string
          updated_at?: string
          uses_count?: number
          value?: number
        }
        Relationships: []
      }
      delivery_zones: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          fee: number
          id: string
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          fee?: number
          id?: string
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          fee?: number
          id?: string
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          selected_acomp: string[] | null
          selected_flavors: string[] | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          selected_acomp?: string[] | null
          selected_flavors?: string[] | null
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          selected_acomp?: string[] | null
          selected_flavors?: string[] | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          archived: boolean
          created_at: string
          customer_name: string
          customer_phone: string | null
          delivery_fee: number
          delivery_zone: string
          delivery_zone_name: string
          id: string
          notes: string | null
          payment_method: string
          status: string
          subtotal: number
          total: number
        }
        Insert: {
          address: string
          archived?: boolean
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          delivery_fee?: number
          delivery_zone: string
          delivery_zone_name: string
          id?: string
          notes?: string | null
          payment_method: string
          status?: string
          subtotal: number
          total: number
        }
        Update: {
          address?: string
          archived?: boolean
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          delivery_fee?: number
          delivery_zone?: string
          delivery_zone_name?: string
          id?: string
          notes?: string | null
          payment_method?: string
          status?: string
          subtotal?: number
          total?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          allow_duplicate_flavors: boolean
          available_flavors: string[] | null
          category: string
          created_at: string
          description: string
          display_order: number
          emoji: string
          has_acomp: boolean
          has_flavors: boolean
          id: string
          image: string
          max_flavors: number | null
          name: string
          price: number
          visible: boolean
        }
        Insert: {
          allow_duplicate_flavors?: boolean
          available_flavors?: string[] | null
          category: string
          created_at?: string
          description: string
          display_order?: number
          emoji?: string
          has_acomp?: boolean
          has_flavors?: boolean
          id: string
          image: string
          max_flavors?: number | null
          name: string
          price: number
          visible?: boolean
        }
        Update: {
          allow_duplicate_flavors?: boolean
          available_flavors?: string[] | null
          category?: string
          created_at?: string
          description?: string
          display_order?: number
          emoji?: string
          has_acomp?: boolean
          has_flavors?: boolean
          id?: string
          image?: string
          max_flavors?: number | null
          name?: string
          price?: number
          visible?: boolean
        }
        Relationships: []
      }
      store_hours: {
        Row: {
          active: boolean
          close_hour: number
          close_minute: number
          created_at: string
          day_type: string
          id: string
          label: string
          open_hour: number
          open_minute: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          close_hour?: number
          close_minute?: number
          created_at?: string
          day_type: string
          id?: string
          label: string
          open_hour?: number
          open_minute?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          close_hour?: number
          close_minute?: number
          created_at?: string
          day_type?: string
          id?: string
          label?: string
          open_hour?: number
          open_minute?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_coupon_uses: { Args: { coupon_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
