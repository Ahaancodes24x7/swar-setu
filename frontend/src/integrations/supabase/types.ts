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
      badge_definitions: {
        Row: {
          code: string
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string | null
          icon: string
          id: string
          name: string
          points_awarded: number
        }
        Insert: {
          code: string
          created_at?: string
          criteria_type: string
          criteria_value?: number
          description?: string | null
          icon?: string
          id?: string
          name: string
          points_awarded?: number
        }
        Update: {
          code?: string
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          icon?: string
          id?: string
          name?: string
          points_awarded?: number
        }
        Relationships: []
      }
      learning_resources: {
        Row: {
          conditions: string[] | null
          created_at: string
          description: string | null
          difficulty: string | null
          duration_minutes: number | null
          grade_max: number
          grade_min: number
          id: string
          language: string
          resource_type: string
          skill_targeted: string
          thumbnail_url: string | null
          title: string
          url: string | null
        }
        Insert: {
          conditions?: string[] | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          grade_max?: number
          grade_min?: number
          id?: string
          language?: string
          resource_type: string
          skill_targeted: string
          thumbnail_url?: string | null
          title: string
          url?: string | null
        }
        Update: {
          conditions?: string[] | null
          created_at?: string
          description?: string | null
          difficulty?: string | null
          duration_minutes?: number | null
          grade_max?: number
          grade_min?: number
          id?: string
          language?: string
          resource_type?: string
          skill_targeted?: string
          thumbnail_url?: string | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          grades: string[] | null
          id: string
          institute_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          grades?: string[] | null
          id?: string
          institute_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          grades?: string[] | null
          id?: string
          institute_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resource_interactions: {
        Row: {
          completed: boolean | null
          id: string
          opened_at: string
          parent_id: string
          resource_id: string | null
          student_id: string | null
          time_spent_minutes: number | null
        }
        Insert: {
          completed?: boolean | null
          id?: string
          opened_at?: string
          parent_id: string
          resource_id?: string | null
          student_id?: string | null
          time_spent_minutes?: number | null
        }
        Update: {
          completed?: boolean | null
          id?: string
          opened_at?: string
          parent_id?: string
          resource_id?: string | null
          student_id?: string | null
          time_spent_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_interactions_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "learning_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_interactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string
          grade: string
          id: string
          name: string
          parent_email: string | null
          parent_id: string | null
          parent_linked_at: string | null
          status: string
          streak_days: number | null
          teacher_id: string | null
          total_points: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          name: string
          parent_email?: string | null
          parent_id?: string | null
          parent_linked_at?: string | null
          status?: string
          streak_days?: number | null
          teacher_id?: string | null
          total_points?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          name?: string
          parent_email?: string | null
          parent_id?: string | null
          parent_linked_at?: string | null
          status?: string
          streak_days?: number | null
          teacher_id?: string | null
          total_points?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      teacher_grade_assignments: {
        Row: {
          created_at: string
          grade: string
          id: string
          institute_name: string | null
          school_id: string | null
          subjects: string[] | null
          teacher_id: string
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          institute_name?: string | null
          school_id?: string | null
          subjects?: string[] | null
          teacher_id: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          institute_name?: string | null
          school_id?: string | null
          subjects?: string[] | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_grade_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_resource_assignments: {
        Row: {
          assigned_at: string
          class_grade: string | null
          completed: boolean | null
          completed_at: string | null
          id: string
          resource_id: string | null
          student_id: string | null
          teacher_id: string
        }
        Insert: {
          assigned_at?: string
          class_grade?: string | null
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          resource_id?: string | null
          student_id?: string | null
          teacher_id: string
        }
        Update: {
          assigned_at?: string
          class_grade?: string | null
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          resource_id?: string | null
          student_id?: string | null
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_resource_assignments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "learning_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_resource_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      test_sessions: {
        Row: {
          analysis_report: Json | null
          audio_url: string | null
          completed_at: string | null
          conducted_by: string | null
          created_at: string
          flagged_conditions: string[] | null
          id: string
          number_score: number | null
          overall_score: number | null
          phoneme_score: number | null
          reading_score: number | null
          status: string
          student_id: string
          test_type: string
        }
        Insert: {
          analysis_report?: Json | null
          audio_url?: string | null
          completed_at?: string | null
          conducted_by?: string | null
          created_at?: string
          flagged_conditions?: string[] | null
          id?: string
          number_score?: number | null
          overall_score?: number | null
          phoneme_score?: number | null
          reading_score?: number | null
          status?: string
          student_id: string
          test_type: string
        }
        Update: {
          analysis_report?: Json | null
          audio_url?: string | null
          completed_at?: string | null
          conducted_by?: string | null
          created_at?: string
          flagged_conditions?: string[] | null
          id?: string
          number_score?: number | null
          overall_score?: number | null
          phoneme_score?: number | null
          reading_score?: number | null
          status?: string
          student_id?: string
          test_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          student_id: string | null
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          student_id?: string | null
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          student_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badge_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      voice_analysis: {
        Row: {
          created_at: string
          detailed_metrics: Json | null
          error_pattern_density: number | null
          id: string
          phoneme_error_rate: number | null
          phoneme_errors: Json | null
          pronunciation_consistency: number | null
          prosodic_score: number | null
          session_id: string
          temporal_score: number | null
          transcription: string | null
        }
        Insert: {
          created_at?: string
          detailed_metrics?: Json | null
          error_pattern_density?: number | null
          id?: string
          phoneme_error_rate?: number | null
          phoneme_errors?: Json | null
          pronunciation_consistency?: number | null
          prosodic_score?: number | null
          session_id: string
          temporal_score?: number | null
          transcription?: string | null
        }
        Update: {
          created_at?: string
          detailed_metrics?: Json | null
          error_pattern_density?: number | null
          id?: string
          phoneme_error_rate?: number | null
          phoneme_errors?: Json | null
          pronunciation_consistency?: number | null
          prosodic_score?: number | null
          session_id?: string
          temporal_score?: number | null
          transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_analysis_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "test_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_practice_sessions: {
        Row: {
          accuracy_score: number | null
          audio_url: string | null
          created_at: string
          feedback: string | null
          fluency_score: number | null
          hesitation_count: number | null
          id: string
          parent_id: string
          pause_duration_ms: number | null
          prompt_text: string
          pronunciation_score: number | null
          spoken_text: string | null
          student_id: string | null
        }
        Insert: {
          accuracy_score?: number | null
          audio_url?: string | null
          created_at?: string
          feedback?: string | null
          fluency_score?: number | null
          hesitation_count?: number | null
          id?: string
          parent_id: string
          pause_duration_ms?: number | null
          prompt_text: string
          pronunciation_score?: number | null
          spoken_text?: string | null
          student_id?: string | null
        }
        Update: {
          accuracy_score?: number | null
          audio_url?: string | null
          created_at?: string
          feedback?: string | null
          fluency_score?: number | null
          hesitation_count?: number | null
          id?: string
          parent_id?: string
          pause_duration_ms?: number | null
          prompt_text?: string
          pronunciation_score?: number | null
          spoken_text?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_practice_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "parent" | "teacher" | "principal"
      user_role: "parent" | "teacher" | "principal"
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
      app_role: ["parent", "teacher", "principal"],
      user_role: ["parent", "teacher", "principal"],
    },
  },
} as const
