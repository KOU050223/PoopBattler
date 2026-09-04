export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      battle_results: {
        Row: {
          companionship_result: boolean | null
          completed_at: string | null
          enemy_attribute: Database["public"]["Enums"]["character_attribute"]
          enemy_character_id: string
          enemy_hp: number
          enemy_power: number
          enemy_speed: number
          id: string
          meal_log_id: string | null
          party_snapshot: Json
          started_at: string
          status: Database["public"]["Enums"]["battle_status"]
          user_id: string
        }
        Insert: {
          companionship_result?: boolean | null
          completed_at?: string | null
          enemy_attribute: Database["public"]["Enums"]["character_attribute"]
          enemy_character_id: string
          enemy_hp?: number
          enemy_power?: number
          enemy_speed?: number
          id?: string
          meal_log_id?: string | null
          party_snapshot?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["battle_status"]
          user_id: string
        }
        Update: {
          companionship_result?: boolean | null
          completed_at?: string | null
          enemy_attribute?: Database["public"]["Enums"]["character_attribute"]
          enemy_character_id?: string
          enemy_hp?: number
          enemy_power?: number
          enemy_speed?: number
          id?: string
          meal_log_id?: string | null
          party_snapshot?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["battle_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_results_enemy_character_id_fkey"
            columns: ["enemy_character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_results_meal_log_id_fkey"
            columns: ["meal_log_id"]
            isOneToOne: false
            referencedRelation: "meal_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bowel_logs: {
        Row: {
          amount: string
          battle_result_id: string
          color: string
          ease: string
          hardness: number
          id: string
          logged_at: string
          user_id: string
        }
        Insert: {
          amount: string
          battle_result_id: string
          color: string
          ease: string
          hardness: number
          id?: string
          logged_at?: string
          user_id: string
        }
        Update: {
          amount?: string
          battle_result_id?: string
          color?: string
          ease?: string
          hardness?: number
          id?: string
          logged_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bowel_logs_battle_result_id_fkey"
            columns: ["battle_result_id"]
            isOneToOne: true
            referencedRelation: "battle_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowel_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          attribute: Database["public"]["Enums"]["character_attribute"]
          created_at: string
          id: string
          image_key: string | null
          name: string
          rarity: Database["public"]["Enums"]["character_rarity"]
        }
        Insert: {
          attribute: Database["public"]["Enums"]["character_attribute"]
          created_at?: string
          id: string
          image_key?: string | null
          name: string
          rarity: Database["public"]["Enums"]["character_rarity"]
        }
        Update: {
          attribute?: Database["public"]["Enums"]["character_attribute"]
          created_at?: string
          id?: string
          image_key?: string | null
          name?: string
          rarity?: Database["public"]["Enums"]["character_rarity"]
        }
        Relationships: []
      }
      meal_logs: {
        Row: {
          created_at: string
          eaten_at: string
          food_groups: string[]
          id: string
          image_path: string
          note: string | null
          tag: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          eaten_at?: string
          food_groups: string[]
          id?: string
          image_path: string
          note?: string | null
          tag?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          eaten_at?: string
          food_groups?: string[]
          id?: string
          image_path?: string
          note?: string | null
          tag?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          last_event_at: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          last_event_at?: string | null
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          last_event_at?: string | null
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_characters: {
        Row: {
          acquired_at: string
          acquired_from_battle_id: string | null
          character_id: string
          hp: number
          id: string
          power: number
          speed: number
          user_id: string
        }
        Insert: {
          acquired_at?: string
          acquired_from_battle_id?: string | null
          character_id: string
          hp: number
          id?: string
          power: number
          speed: number
          user_id: string
        }
        Update: {
          acquired_at?: string
          acquired_from_battle_id?: string | null
          character_id?: string
          hp?: number
          id?: string
          power?: number
          speed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_characters_acquired_from_battle_id_fkey"
            columns: ["acquired_from_battle_id"]
            isOneToOne: true
            referencedRelation: "battle_results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_characters_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_characters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_battle: {
        Args: {
          p_amount: string
          p_battle_id: string
          p_color: string
          p_ease: string
          p_hardness: number
          p_meal_log_id?: string
        }
        Returns: {
          battle_id: string
          character_id: string
          companionship_result: boolean
          status: Database["public"]["Enums"]["battle_status"]
        }[]
      }
      start_battle: {
        Args: { p_user_character_ids?: string[] }
        Returns: {
          battle_id: string
          enemy_attribute: Database["public"]["Enums"]["character_attribute"]
          enemy_character_id: string
          enemy_hp: number
          enemy_power: number
          enemy_speed: number
          party_snapshot: Json
          resumed: boolean
        }[]
      }
    }
    Enums: {
      battle_status: "active" | "won" | "completed"
      character_attribute:
        | "curry"
        | "vegetable"
        | "spicy"
        | "meat"
        | "sweet"
        | "dairy"
        | "normal"
      character_rarity: "common" | "rare" | "epic" | "legendary"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      battle_status: ["active", "won", "completed"],
      character_attribute: [
        "curry",
        "vegetable",
        "spicy",
        "meat",
        "sweet",
        "dairy",
        "normal",
      ],
      character_rarity: ["common", "rare", "epic", "legendary"],
    },
  },
} as const
