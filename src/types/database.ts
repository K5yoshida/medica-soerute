// ===========================================
// Database Types - Supabase Schema
// ===========================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ----- Enums -----
export type UserRole = 'user' | 'admin' | 'super_admin'
export type PlanType = 'free' | 'light' | 'standard' | 'premium'
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type MediaCategory = 'general' | 'nursing' | 'pharmacy' | 'dental' | 'welfare' | 'rehabilitation'

// ----- Tables -----
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          company_name: string | null
          role: UserRole
          plan: PlanType
          monthly_analysis_count: number
          monthly_analysis_limit: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          company_name?: string | null
          role?: UserRole
          plan?: PlanType
          monthly_analysis_count?: number
          monthly_analysis_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          company_name?: string | null
          role?: UserRole
          plan?: PlanType
          monthly_analysis_count?: number
          monthly_analysis_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      media_master: {
        Row: {
          id: string
          name: string
          category: MediaCategory
          description: string | null
          features: Json
          price_range: string | null
          target_audience: string | null
          strengths: string[]
          weaknesses: string[]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: MediaCategory
          description?: string | null
          features?: Json
          price_range?: string | null
          target_audience?: string | null
          strengths?: string[]
          weaknesses?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: MediaCategory
          description?: string | null
          features?: Json
          price_range?: string | null
          target_audience?: string | null
          strengths?: string[]
          weaknesses?: string[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      analysis_results: {
        Row: {
          id: string
          user_id: string
          job_requirements: Json
          status: AnalysisStatus
          matched_media: Json | null
          analysis_detail: Json | null
          recommendations: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          job_requirements: Json
          status?: AnalysisStatus
          matched_media?: Json | null
          analysis_detail?: Json | null
          recommendations?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          job_requirements?: Json
          status?: AnalysisStatus
          matched_media?: Json | null
          analysis_detail?: Json | null
          recommendations?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      peso_diagnoses: {
        Row: {
          id: string
          user_id: string
          diagnosis_data: Json
          scores: Json
          recommendations: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          diagnosis_data: Json
          scores: Json
          recommendations?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          diagnosis_data?: Json
          scores?: Json
          recommendations?: Json | null
          created_at?: string
        }
      }
      usage_logs: {
        Row: {
          id: string
          user_id: string
          action_type: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action_type?: string
          metadata?: Json | null
          created_at?: string
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
      user_role: UserRole
      plan_type: PlanType
      analysis_status: AnalysisStatus
      media_category: MediaCategory
    }
  }
}

// ----- Helper Types -----
export type User = Database['public']['Tables']['users']['Row']
export type MediaMaster = Database['public']['Tables']['media_master']['Row']
export type AnalysisResult = Database['public']['Tables']['analysis_results']['Row']
export type PesoDiagnosis = Database['public']['Tables']['peso_diagnoses']['Row']
export type UsageLog = Database['public']['Tables']['usage_logs']['Row']
