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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      menu_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          available: boolean
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          available?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          menu_item_id: string | null
          name: string
          notes: string | null
          order_id: string
          qty: number
          status: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: number
          menu_item_id?: string | null
          name: string
          notes?: string | null
          order_id: string
          qty?: number
          status?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          menu_item_id?: string | null
          name?: string
          notes?: string | null
          order_id?: string
          qty?: number
          status?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
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
          closed_at: string | null
          created_at: string
          discount: number
          id: string
          notes: string | null
          opened_at: string
          payment_method: string | null
          service_fee: number
          service_fee_pct: number
          status: string
          subtotal: number
          table_id: string | null
          table_number: number
          total: number
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          opened_at?: string
          payment_method?: string | null
          service_fee?: number
          service_fee_pct?: number
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number: number
          total?: number
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          opened_at?: string
          payment_method?: string | null
          service_fee?: number
          service_fee_pct?: number
          status?: string
          subtotal?: number
          table_id?: string | null
          table_number?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          bg_fit: string
          bg_image_url: string | null
          bg_pos_x: number
          bg_pos_y: number
          bg_zoom: number
          default_theme: string
          establishment_name: string | null
          id: number
          logo_url: string | null
          service_fee_pct: number
          updated_at: string
        }
        Insert: {
          bg_fit?: string
          bg_image_url?: string | null
          bg_pos_x?: number
          bg_pos_y?: number
          bg_zoom?: number
          default_theme?: string
          establishment_name?: string | null
          id?: number
          logo_url?: string | null
          service_fee_pct?: number
          updated_at?: string
        }
        Update: {
          bg_fit?: string
          bg_image_url?: string | null
          bg_pos_x?: number
          bg_pos_y?: number
          bg_zoom?: number
          default_theme?: string
          establishment_name?: string | null
          id?: number
          logo_url?: string | null
          service_fee_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      table_visits: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          occupied_name: string | null
          party_size: number | null
          started_at: string
          table_id: string | null
          table_number: number
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          occupied_name?: string | null
          party_size?: number | null
          started_at?: string
          table_id?: string | null
          table_number: number
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          occupied_name?: string | null
          party_size?: number | null
          started_at?: string
          table_id?: string | null
          table_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "table_visits_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          created_at: string
          h: number
          id: string
          label: string | null
          number: number
          occupied: boolean
          occupied_name: string | null
          occupied_since: string | null
          party_size: number | null
          seats: number
          shape: string
          updated_at: string
          w: number
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          h?: number
          id?: string
          label?: string | null
          number: number
          occupied?: boolean
          occupied_name?: string | null
          occupied_since?: string | null
          party_size?: number | null
          seats?: number
          shape?: string
          updated_at?: string
          w?: number
          x: number
          y: number
        }
        Update: {
          created_at?: string
          h?: number
          id?: string
          label?: string | null
          number?: number
          occupied?: boolean
          occupied_name?: string | null
          occupied_since?: string | null
          party_size?: number | null
          seats?: number
          shape?: string
          updated_at?: string
          w?: number
          x?: number
          y?: number
        }
        Relationships: []
      }
      text_labels: {
        Row: {
          created_at: string
          font_size: number
          id: string
          text: string
          x: number
          y: number
        }
        Insert: {
          created_at?: string
          font_size?: number
          id?: string
          text: string
          x: number
          y: number
        }
        Update: {
          created_at?: string
          font_size?: number
          id?: string
          text?: string
          x?: number
          y?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "kitchen" | "waiter" | "cashier"
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
    Enums: {
      app_role: ["admin", "kitchen", "waiter", "cashier"],
    },
  },
} as const
