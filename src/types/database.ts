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
// クエリ意図: branded=指名検索, transactional=応募意図, informational=情報収集, b2b=法人向け
export type QueryIntentType = 'branded' | 'transactional' | 'informational' | 'b2b' | 'unknown'
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
      // P3-1: analysis_results → matching_results にリネーム（設計書12_DB一覧との整合性）
      matching_results: {
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
      // キーワードマスター（旧query_master）
      keywords: {
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
      // 媒体別キーワードデータ（旧media_query_data）
      media_keywords: {
        Row: {
          id: string
          keyword_id: string
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
          keyword_id: string
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
          keyword_id?: string
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
      // P3-2: 監査ログテーブル（設計書: 12_DB一覧）
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action_type: string
          resource_type: string
          resource_id: string | null
          old_value: Json | null
          new_value: Json | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action_type: string
          resource_type: string
          resource_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action_type?: string
          resource_type?: string
          resource_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      // P3-3: 職種マスターテーブル
      job_categories: {
        Row: {
          id: string
          code: string
          name: string
          parent_id: string | null
          category: MediaCategory
          sort_order: number
          is_active: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          parent_id?: string | null
          category?: MediaCategory
          sort_order?: number
          is_active?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          parent_id?: string | null
          category?: MediaCategory
          sort_order?: number
          is_active?: boolean
          metadata?: Json
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
// P3-1: analysis_results → matching_results
export type MatchingResult = Database['public']['Tables']['matching_results']['Row']
// 後方互換性のためエイリアスを維持（将来的に削除予定）
export type AnalysisResult = MatchingResult
export type PesoDiagnosis = Database['public']['Tables']['peso_diagnoses']['Row']
export type UsageLog = Database['public']['Tables']['usage_logs']['Row']
export type AllowedDomain = Database['public']['Tables']['allowed_domains']['Row']
// キーワードマスター（旧QueryMaster）
export type Keyword = Database['public']['Tables']['keywords']['Row']
// 後方互換性のためエイリアスを維持（将来的に削除予定）
export type QueryMaster = Keyword
// 媒体別キーワードデータ（旧MediaQueryData）
export type MediaKeyword = Database['public']['Tables']['media_keywords']['Row']
// 後方互換性のためエイリアスを維持（将来的に削除予定）
export type MediaQueryData = MediaKeyword
export type TacticsMaster = Database['public']['Tables']['tactics_master']['Row']
// P3-2: 監査ログ
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
// P3-3: マスターテーブル
export type JobCategory = Database['public']['Tables']['job_categories']['Row']
