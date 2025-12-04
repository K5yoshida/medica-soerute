// ===========================================
// Common Types
// ===========================================

export * from './database'

// ----- API Response Types -----
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// ----- Job Requirements -----
export interface JobRequirements {
  jobType: string // 職種
  employmentType: string // 雇用形態
  location: string // 勤務地
  salary?: {
    min?: number
    max?: number
  }
  qualifications?: string[] // 必要資格
  experience?: string // 経験年数
  workStyle?: string[] // 働き方（日勤のみ、夜勤あり等）
  benefits?: string[] // 福利厚生
  urgency?: 'low' | 'medium' | 'high' // 採用緊急度
  targetAge?: string // ターゲット年齢層
  additionalInfo?: string // その他条件
}

// ----- Analysis Types -----
export interface MatchedMedia {
  mediaId: string
  mediaName: string
  matchScore: number // 0-100
  matchReasons: string[]
  strengths: string[]
  considerations: string[]
  estimatedCost?: string
  recommendedPeriod?: string
}

export interface AnalysisDetail {
  overallAssessment: string
  marketAnalysis: string
  competitorAnalysis?: string
  recommendations: string[]
}

// ----- PESO Types -----
export interface PesoScores {
  paid: number // 0-100
  earned: number // 0-100
  shared: number // 0-100
  owned: number // 0-100
}

export interface PesoDiagnosisData {
  currentActivities: {
    paid: string[]
    earned: string[]
    shared: string[]
    owned: string[]
  }
  budget?: {
    total: number
    breakdown?: Record<string, number>
  }
  goals?: string[]
}

// ----- Plan Types -----
export interface PlanFeatures {
  analysisLimit: number
  pesoAccess: boolean
  exportPdf: boolean
  prioritySupport: boolean
  customReports: boolean
}

export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  free: {
    analysisLimit: 3,
    pesoAccess: false,
    exportPdf: false,
    prioritySupport: false,
    customReports: false,
  },
  light: {
    analysisLimit: 10,
    pesoAccess: true,
    exportPdf: false,
    prioritySupport: false,
    customReports: false,
  },
  standard: {
    analysisLimit: 30,
    pesoAccess: true,
    exportPdf: true,
    prioritySupport: false,
    customReports: false,
  },
  premium: {
    analysisLimit: -1, // 無制限
    pesoAccess: true,
    exportPdf: true,
    prioritySupport: true,
    customReports: true,
  },
}

// ----- Form Types -----
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  password: string
  confirmPassword: string
  companyName?: string
}

// ----- Component Props -----
export interface PageProps {
  params: { [key: string]: string }
  searchParams: { [key: string]: string | string[] | undefined }
}
