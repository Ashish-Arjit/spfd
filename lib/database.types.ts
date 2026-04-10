export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      id_verification_logs: {
        Row: {
          id: string
          user_id: string | null
          roll_entered: string | null
          roll_extracted: string | null
          logo_detected: boolean | null
          verified: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          roll_entered?: string | null
          roll_extracted?: string | null
          logo_detected?: boolean | null
          verified?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          roll_entered?: string | null
          roll_extracted?: string | null
          logo_detected?: boolean | null
          verified?: boolean | null
          created_at?: string | null
        }
      }
      milestones: {
        Row: {
          id: string
          project_id: string | null
          week_target: number | null
          description: string
          completed: boolean | null
          deadline: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          week_target?: number | null
          description: string
          completed?: boolean | null
          deadline?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          week_target?: number | null
          description?: string
          completed?: boolean | null
          deadline?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          role: string | null
          student_id: string | null
          created_at: string | null
          roll_number: string | null
          verified: boolean | null
          id_card_image: string | null
        }
        Insert: {
          id: string
          email: string
          role?: string | null
          student_id?: string | null
          created_at?: string | null
          roll_number?: string | null
          verified?: boolean | null
          id_card_image?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: string | null
          student_id?: string | null
          created_at?: string | null
          roll_number?: string | null
          verified?: boolean | null
          id_card_image?: string | null
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          team_size: number | null
          students: Json | null
          created_by: string | null
          created_at: string | null
          week_current: number | null
          teacher_id: string | null
        }
        Insert: {
          id: string
          name: string
          team_size?: number | null
          students?: Json | null
          created_by?: string | null
          created_at?: string | null
          week_current?: number | null
          teacher_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          team_size?: number | null
          students?: Json | null
          created_by?: string | null
          created_at?: string | null
          week_current?: number | null
          teacher_id?: string | null
        }
      }
      student_signup_profiles: {
        Row: {
          id: number
          created_at: string
          user_id: string
          name: string
          enrollment_number: string
          email: string
          id_card_url: string | null
        }
        Insert: {
          id?: never
          created_at?: string
          user_id: string
          name: string
          enrollment_number: string
          email: string
          id_card_url?: string | null
        }
        Update: {
          id?: never
          created_at?: string
          user_id?: string
          name?: string
          enrollment_number?: string
          email?: string
          id_card_url?: string | null
        }
      }
      teacher_signup_profiles: {
        Row: {
          id: number
          created_at: string
          user_id: string
          name: string
          email: string
          phone_number: string | null
          university: string | null
          id_card_url: string | null
        }
        Insert: {
          id?: never
          created_at?: string
          user_id: string
          name: string
          email: string
          phone_number?: string | null
          university?: string | null
          id_card_url?: string | null
        }
        Update: {
          id?: never
          created_at?: string
          user_id?: string
          name?: string
          email?: string
          phone_number?: string | null
          university?: string | null
          id_card_url?: string | null
        }
      }
      team_members: {
        Row: {
          project_id: string
          student_id: string
          joined_at: string | null
        }
        Insert: {
          project_id: string
          student_id: string
          joined_at?: string | null
        }
        Update: {
          project_id?: string
          student_id?: string
          joined_at?: string | null
        }
      }
      weekly_entries: {
        Row: {
          id: string
          project_id: string | null
          week_number: number
          days_total: number | null
          work_description: string | null
          lab_attended: boolean | null
          demo_shown: boolean | null
          milestones_hit: Json | null
          teacher_notes: string | null
          created_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          project_id?: string | null
          week_number: number
          days_total?: number | null
          work_description?: string | null
          lab_attended?: boolean | null
          demo_shown?: boolean | null
          milestones_hit?: Json | null
          teacher_notes?: string | null
          created_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          project_id?: string | null
          week_number?: number
          days_total?: number | null
          work_description?: string | null
          lab_attended?: boolean | null
          demo_shown?: boolean | null
          milestones_hit?: Json | null
          teacher_notes?: string | null
          created_at?: string | null
          created_by?: string | null
        }
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
