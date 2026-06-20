import { apiClient } from './client'
import type { MoodLog, MoodHistoryResponse, MoodLevel, StressLevel } from '../types'

export const moodApi = {
  log: async (
    mood: MoodLevel,
    stress: StressLevel,
    notes?: string,
    activities?: string[]
  ): Promise<MoodLog> => {
    const { data } = await apiClient.post<MoodLog>('/mood', {
      mood,
      stress,
      notes,
      activities: activities || [],
    })
    return data
  },

  getHistory: async (limit = 20, offset = 0): Promise<MoodHistoryResponse> => {
    const { data } = await apiClient.get<MoodHistoryResponse>('/mood/history', {
      params: { limit, offset },
    })
    return data
  },
}
