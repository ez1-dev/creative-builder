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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_profiles: {
        Row: {
          ai_enabled: boolean
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          ai_enabled?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          ai_enabled?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      colaboradores_catalogo: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_widgets: {
        Row: {
          config: Json
          created_at: string
          dashboard_id: string
          id: string
          layout: Json
          position: number
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          dashboard_id: string
          id?: string
          layout?: Json
          position?: number
          title?: string
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          dashboard_id?: string
          id?: string
          layout?: Json
          position?: number
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_widgets_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          module: string
          name: string
          owner_id: string | null
          position: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          module: string
          name: string
          owner_id?: string | null
          position?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          module?: string
          name?: string
          owner_id?: string | null
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          message: string
          module: string
          status_code: number | null
          user_email: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          module: string
          status_code?: number | null
          user_email?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          module?: string
          status_code?: number | null
          user_email?: string | null
        }
        Relationships: []
      }
      passagens_aereas: {
        Row: {
          centro_custo: string | null
          cia_aerea: string | null
          colaborador: string
          created_at: string
          created_by: string | null
          data_ida: string | null
          data_registro: string
          data_volta: string | null
          destino: string | null
          fornecedor: string | null
          id: string
          localizador: string | null
          motivo_viagem: string | null
          numero_bilhete: string | null
          observacoes: string | null
          origem: string | null
          projeto_obra: string | null
          tipo_despesa: string
          updated_at: string
          valor: number
        }
        Insert: {
          centro_custo?: string | null
          cia_aerea?: string | null
          colaborador: string
          created_at?: string
          created_by?: string | null
          data_ida?: string | null
          data_registro?: string
          data_volta?: string | null
          destino?: string | null
          fornecedor?: string | null
          id?: string
          localizador?: string | null
          motivo_viagem?: string | null
          numero_bilhete?: string | null
          observacoes?: string | null
          origem?: string | null
          projeto_obra?: string | null
          tipo_despesa: string
          updated_at?: string
          valor?: number
        }
        Update: {
          centro_custo?: string | null
          cia_aerea?: string | null
          colaborador?: string
          created_at?: string
          created_by?: string | null
          data_ida?: string | null
          data_registro?: string
          data_volta?: string | null
          destino?: string | null
          fornecedor?: string | null
          id?: string
          localizador?: string | null
          motivo_viagem?: string | null
          numero_bilhete?: string | null
          observacoes?: string | null
          origem?: string | null
          projeto_obra?: string | null
          tipo_despesa?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      passagens_aereas_share_links: {
        Row: {
          access_count: number
          active: boolean
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          nome: string
          password_hash: string | null
          token: string
          updated_at: string
        }
        Insert: {
          access_count?: number
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          nome: string
          password_hash?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          access_count?: number
          active?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          nome?: string
          password_hash?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_screens: {
        Row: {
          can_edit: boolean
          can_view: boolean
          id: string
          profile_id: string
          screen_name: string
          screen_path: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          id?: string
          profile_id: string
          screen_name: string
          screen_path: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          id?: string
          profile_id?: string
          screen_name?: string
          screen_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_screens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_visuals: {
        Row: {
          can_view: boolean
          created_at: string
          id: string
          profile_id: string
          updated_at: string
          visual_key: string
        }
        Insert: {
          can_view?: boolean
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
          visual_key: string
        }
        Update: {
          can_view?: boolean
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
          visual_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_visuals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string | null
          display_name: string | null
          email: string | null
          erp_user: string | null
          id: string
        }
        Insert: {
          approved?: boolean
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          erp_user?: string | null
          id: string
        }
        Update: {
          approved?: boolean
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          erp_user?: string | null
          id?: string
        }
        Relationships: []
      }
      user_access: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          user_login: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          user_login: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          user_login?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "access_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          action: string | null
          created_at: string
          details: Json | null
          event_type: string
          id: string
          path: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          path?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          path?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ai_assistant_prefs: Json
          favorite_modules: Json
          frequent_filters: Json
          preferred_period: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_assistant_prefs?: Json
          favorite_modules?: Json
          frequent_filters?: Json
          preferred_period?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_assistant_prefs?: Json
          favorite_modules?: Json
          frequent_filters?: Json
          preferred_period?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_search_history: {
        Row: {
          created_at: string
          filters: Json
          id: string
          module: string
          result_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          module: string
          result_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          module?: string
          result_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          current_path: string | null
          display_name: string | null
          last_seen_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          current_path?: string | null
          display_name?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          current_path?: string | null
          display_name?: string | null
          last_seen_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_passagens_share: { Args: { _uid: string }; Returns: boolean }
      cleanup_old_error_logs: { Args: never; Returns: undefined }
      cleanup_old_search_history: { Args: never; Returns: undefined }
      cleanup_old_user_activity: { Args: never; Returns: undefined }
      create_passagens_share_link: {
        Args: {
          _expires_at?: string
          _nome: string
          _password?: string
          _token: string
        }
        Returns: string
      }
      get_passagens_via_token: {
        Args: { _password?: string; _token: string }
        Returns: {
          centro_custo: string | null
          cia_aerea: string | null
          colaborador: string
          created_at: string
          created_by: string | null
          data_ida: string | null
          data_registro: string
          data_volta: string | null
          destino: string | null
          fornecedor: string | null
          id: string
          localizador: string | null
          motivo_viagem: string | null
          numero_bilhete: string | null
          observacoes: string | null
          origem: string | null
          projeto_obra: string | null
          tipo_despesa: string
          updated_at: string
          valor: number
        }[]
        SetofOptions: {
          from: "*"
          to: "passagens_aereas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_share_link_meta: {
        Args: { _token: string }
        Returns: {
          exists_link: boolean
          expired: boolean
          nome: string
          requires_password: boolean
        }[]
      }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      validate_share_token: {
        Args: { _password?: string; _token: string }
        Returns: boolean
      }
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
