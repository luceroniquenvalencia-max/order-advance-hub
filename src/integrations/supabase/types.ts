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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      pedidos_dia: {
        Row: {
          archivo: string | null
          asesor: string
          cantidad: number
          cliente: string
          distrito: string
          fecha_despacho: string
          id: string
          orden: number
          pedido: string
          sku: string
          subido_at: string
          subido_por: string | null
          valorizado: number | null
          volumen: number | null
        }
        Insert: {
          archivo?: string | null
          asesor?: string
          cantidad?: number
          cliente?: string
          distrito?: string
          fecha_despacho?: string
          id?: string
          orden?: number
          pedido: string
          sku?: string
          subido_at?: string
          subido_por?: string | null
          valorizado?: number | null
          volumen?: number | null
        }
        Update: {
          archivo?: string | null
          asesor?: string
          cantidad?: number
          cliente?: string
          distrito?: string
          fecha_despacho?: string
          id?: string
          orden?: number
          pedido?: string
          sku?: string
          subido_at?: string
          subido_por?: string | null
          valorizado?: number | null
          volumen?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          nombre?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      solicitud_historial: {
        Row: {
          accion: string
          created_at: string
          detalle: string | null
          estado_anterior:
            | Database["public"]["Enums"]["estado_solicitud"]
            | null
          estado_nuevo: Database["public"]["Enums"]["estado_solicitud"] | null
          id: string
          solicitud_id: string
          usuario_email: string | null
        }
        Insert: {
          accion: string
          created_at?: string
          detalle?: string | null
          estado_anterior?:
            | Database["public"]["Enums"]["estado_solicitud"]
            | null
          estado_nuevo?: Database["public"]["Enums"]["estado_solicitud"] | null
          id?: string
          solicitud_id: string
          usuario_email?: string | null
        }
        Update: {
          accion?: string
          created_at?: string
          detalle?: string | null
          estado_anterior?:
            | Database["public"]["Enums"]["estado_solicitud"]
            | null
          estado_nuevo?: Database["public"]["Enums"]["estado_solicitud"] | null
          id?: string
          solicitud_id?: string
          usuario_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitud_historial_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes: {
        Row: {
          asesor_email: string
          asesor_id: string
          asesor_nombre: string
          atendido_por: string | null
          codigo: string
          comentario_atencion: string | null
          created_at: string
          estado: Database["public"]["Enums"]["estado_solicitud"]
          fecha_atencion: string | null
          fecha_programada: string | null
          fecha_solicitada: string
          id: string
          motivo: string
          numero_pedido: string
          observacion_asesor: string | null
          observacion_final: string | null
          sheet_synced_at: string | null
          updated_at: string
        }
        Insert: {
          asesor_email: string
          asesor_id?: string
          asesor_nombre: string
          atendido_por?: string | null
          codigo?: string
          comentario_atencion?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_solicitud"]
          fecha_atencion?: string | null
          fecha_programada?: string | null
          fecha_solicitada: string
          id?: string
          motivo: string
          numero_pedido: string
          observacion_asesor?: string | null
          observacion_final?: string | null
          sheet_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          asesor_email?: string
          asesor_id?: string
          asesor_nombre?: string
          atendido_por?: string | null
          codigo?: string
          comentario_atencion?: string | null
          created_at?: string
          estado?: Database["public"]["Enums"]["estado_solicitud"]
          fecha_atencion?: string | null
          fecha_programada?: string | null
          fecha_solicitada?: string
          id?: string
          motivo?: string
          numero_pedido?: string
          observacion_asesor?: string | null
          observacion_final?: string | null
          sheet_synced_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      reemplazar_pedidos_dia: {
        Args: { _archivo: string; _filas: Json }
        Returns: number
      }
    }
    Enums: {
      app_role: "admin" | "asesor"
      estado_solicitud:
        | "PENDIENTE"
        | "EN_VALIDACION"
        | "ATENDIDO"
        | "NO_ATENDIDO"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "asesor"],
      estado_solicitud: [
        "PENDIENTE",
        "EN_VALIDACION",
        "ATENDIDO",
        "NO_ATENDIDO",
      ],
    },
  },
} as const
