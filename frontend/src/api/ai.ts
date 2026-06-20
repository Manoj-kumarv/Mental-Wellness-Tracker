import { apiClient } from './client'
import type { JournalAnalysis, ChatResponse, WeeklyInsight } from '../types'

export const aiApi = {
  analyzeJournal: async (entry_id: string): Promise<JournalAnalysis> => {
    const { data } = await apiClient.post<JournalAnalysis>('/ai/analyze-journal', { entry_id })
    return data
  },

  chat: async (message: string, conversation_id?: string): Promise<ChatResponse> => {
    const { data } = await apiClient.post<ChatResponse>('/ai/chat', {
      message,
      conversation_id,
    })
    return data
  },

  getWeeklyInsights: async (): Promise<WeeklyInsight> => {
    const { data } = await apiClient.get<WeeklyInsight>('/ai/weekly-insights')
    return data
  },
}
