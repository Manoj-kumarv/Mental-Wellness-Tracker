import { apiClient } from './client'
import type { JournalEntry, JournalHistoryResponse } from '../types'

export const journalApi = {
  create: async (
    content: string,
    exam_type?: string,
    study_hours?: number
  ): Promise<JournalEntry> => {
    const { data } = await apiClient.post<JournalEntry>('/journal', {
      content,
      exam_type,
      study_hours,
    })
    return data
  },

  getHistory: async (limit = 20, offset = 0): Promise<JournalHistoryResponse> => {
    const { data } = await apiClient.get<JournalHistoryResponse>('/journal/history', {
      params: { limit, offset },
    })
    return data
  },
}
