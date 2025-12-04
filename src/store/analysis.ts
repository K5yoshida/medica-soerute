// ===========================================
// Analysis Store (Zustand)
// ===========================================

import { create } from 'zustand'
import type { JobRequirements, MatchedMedia, AnalysisDetail } from '@/types'

interface AnalysisState {
  // 入力データ
  jobRequirements: JobRequirements | null
  // 分析結果
  matchedMedia: MatchedMedia[]
  analysisDetail: AnalysisDetail | null
  // 状態管理
  isAnalyzing: boolean
  error: string | null
  // アクション
  setJobRequirements: (requirements: JobRequirements) => void
  setAnalysisResult: (result: {
    matchedMedia: MatchedMedia[]
    analysisDetail: AnalysisDetail
  }) => void
  setAnalyzing: (isAnalyzing: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  jobRequirements: null,
  matchedMedia: [],
  analysisDetail: null,
  isAnalyzing: false,
  error: null,
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  ...initialState,
  setJobRequirements: (jobRequirements) => set({ jobRequirements }),
  setAnalysisResult: ({ matchedMedia, analysisDetail }) =>
    set({
      matchedMedia,
      analysisDetail,
      isAnalyzing: false,
      error: null,
    }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setError: (error) => set({ error, isAnalyzing: false }),
  reset: () => set(initialState),
}))
