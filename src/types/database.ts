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
// ロール: admin=システム管理者, internal=社内/法人ユーザー, user=外部個人ユーザー
export type UserRole = 'admin' | 'internal' | 'user'
// プラン: medica=社内, enterprise=法人契約, trial=14日間無料, starter/professional=有料プラン
export type PlanType = 'medica' | 'enterprise' | 'trial' | 'starter' | 'professional'
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type MediaCategory = 'general' | 'nursing' | 'pharmacy' | 'dental' | 'welfare' | 'rehabilitation'
// クエリ意図: branded=指名検索, transactional=応募直前, commercial=比較検討, informational=情報収集
export type QueryIntentType = 'branded' | 'transactional' | 'commercial' | 'informational' | 'unknown'
// 分類ソース: rule=ルールベース, ai=Claude AI, manual=管理者手動, unknown=不明
export type ClassificationSourceType = 'rule' | 'ai' | 'manual' | 'unknown'
// PESOカテゴリ: GAP-021
export type PesoCategory = 'paid' | 'earned' | 'shared' | 'owned'
// 実装難易度
export type ImplementationDifficulty = 'easy' | 'medium' | 'hard'
// 期待インパクト
export type ExpectedImpact = 'low' | 'medium' | 'high'

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
          trial_ends_at: string | null
          monthly_analysis_count: number
          monthly_analysis_limit: number
          monthly_peso_count: number
          monthly_peso_limit: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          upgrade_notified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          company_name?: string | null
          role?: UserRole
          plan?: PlanType
          trial_ends_at?: string | null
          monthly_analysis_count?: number
          monthly_analysis_limit?: number
          monthly_peso_count?: number
          monthly_peso_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          upgrade_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          company_name?: string | null
          role?: UserRole
          plan?: PlanType
          trial_ends_at?: string | null
          monthly_analysis_count?: number
          monthly_analysis_limit?: number
          monthly_peso_count?: number
          monthly_peso_limit?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          upgrade_notified_at?: string | null
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
      allowed_domains: {
        Row: {
          id: string
          domain: string
          plan: 'medica' | 'enterprise'
          organization_name: string | null
          max_users: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          domain: string
          plan: 'medica' | 'enterprise'
          organization_name?: string | null
          max_users?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          domain?: string
          plan?: 'medica' | 'enterprise'
          organization_name?: string | null
          max_users?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      query_master: {
        Row: {
          id: string
          keyword: string
          keyword_normalized: string
          intent: QueryIntentType
          intent_confidence: string | null
          intent_reason: string | null
          intent_updated_at: string | null
          max_monthly_search_volume: number | null
          max_cpc: number | null
          is_verified: boolean
          verified_by: string | null
          verified_at: string | null
          classification_source: ClassificationSourceType
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          keyword: string
          keyword_normalized: string
          intent?: QueryIntentType
          intent_confidence?: string | null
          intent_reason?: string | null
          intent_updated_at?: string | null
          max_monthly_search_volume?: number | null
          max_cpc?: number | null
          is_verified?: boolean
          verified_by?: string | null
          verified_at?: string | null
          classification_source?: ClassificationSourceType
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          keyword?: string
          keyword_normalized?: string
          intent?: QueryIntentType
          intent_confidence?: string | null
          intent_reason?: string | null
          intent_updated_at?: string | null
          max_monthly_search_volume?: number | null
          max_cpc?: number | null
          is_verified?: boolean
          verified_by?: string | null
          verified_at?: string | null
          classification_source?: ClassificationSourceType
          created_at?: string
          updated_at?: string
        }
      }
      media_query_data: {
        Row: {
          id: string
          query_id: string
          media_id: string
          ranking_position: number | null
          monthly_search_volume: number | null
          estimated_traffic: number | null
          cpc: number | null
          competition_level: number | null
          seo_difficulty: number | null
          landing_url: string | null
          imported_at: string
          source_file: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          query_id: string
          media_id: string
          ranking_position?: number | null
          monthly_search_volume?: number | null
          estimated_traffic?: number | null
          cpc?: number | null
          competition_level?: number | null
          seo_difficulty?: number | null
          landing_url?: string | null
          imported_at?: string
          source_file?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          query_id?: string
          media_id?: string
          ranking_position?: number | null
          monthly_search_volume?: number | null
          estimated_traffic?: number | null
          cpc?: number | null
          competition_level?: number | null
          seo_difficulty?: number | null
          landing_url?: string | null
          imported_at?: string
          source_file?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // GAP-021: PESO施策マスターテーブル
      // GAP-011: 4フレームワークマッピング追加
      tactics_master: {
        Row: {
          id: string
          category: PesoCategory
          name: string
          name_en: string | null
          description: string | null
          sort_order: number
          evaluation_criteria: Json
          recommended_for: Json
          implementation_difficulty: ImplementationDifficulty | null
          estimated_cost_range: string | null
          expected_impact: ExpectedImpact | null
          is_active: boolean
          // GAP-011: 4フレームワークマッピング
          funnel_stages: number[] | null // 1=認知, 2=興味, 3=比較, 4=応募
          conversion_stages: number[] | null // 1=Impression, 2=PV, 3=CV
          journey_stages: number[] | null // 1=検索, 2=探索, 3=保存, 4=評価, 5=応募
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category: PesoCategory
          name: string
          name_en?: string | null
          description?: string | null
          sort_order?: number
          evaluation_criteria?: Json
          recommended_for?: Json
          implementation_difficulty?: ImplementationDifficulty | null
          estimated_cost_range?: string | null
          expected_impact?: ExpectedImpact | null
          is_active?: boolean
          funnel_stages?: number[] | null
          conversion_stages?: number[] | null
          journey_stages?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category?: PesoCategory
          name?: string
          name_en?: string | null
          description?: string | null
          sort_order?: number
          evaluation_criteria?: Json
          recommended_for?: Json
          implementation_difficulty?: ImplementationDifficulty | null
          estimated_cost_range?: string | null
          expected_impact?: ExpectedImpact | null
          is_active?: boolean
          funnel_stages?: number[] | null
          conversion_stages?: number[] | null
          journey_stages?: number[] | null
          created_at?: string
          updated_at?: string
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
export type AllowedDomain = Database['public']['Tables']['allowed_domains']['Row']
export type QueryMaster = Database['public']['Tables']['query_master']['Row']
export type MediaQueryData = Database['public']['Tables']['media_query_data']['Row']
export type TacticsMaster = Database['public']['Tables']['tactics_master']['Row']
