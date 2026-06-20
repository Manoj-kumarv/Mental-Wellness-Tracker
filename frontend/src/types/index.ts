// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types aligned with backend Pydantic schemas
// ─────────────────────────────────────────────────────────────────────────────

export type UserType = 'authenticated' | 'guest'

export interface AuthResponse {
  access_token: string
  token_type: string
  user_type: UserType
  user_id: string
  name?: string
  expires_in: number
}

export interface GuestSessionResponse {
  session_id: string
  token: string
  token_type: string
  user_type: 'guest'
  expires_in: number
}

export interface UserProfile {
  user_id: string
  user_type: UserType
  name?: string
  email?: string
  created_at: string
}

export interface AuthState {
  token: string | null
  user: UserProfile | null
  isAuthenticated: boolean
  isGuest: boolean
}

// ─── Journal ─────────────────────────────────────────────────────────────────

export type ExamType = 'NEET' | 'JEE' | 'CUET' | 'CAT' | 'GATE' | 'UPSC' | 'OTHER'

export interface JournalEntry {
  entry_id: string
  content: string
  exam_type?: ExamType
  study_hours?: number
  created_at: string
  ai_analysis?: JournalAnalysis | null
}

export interface JournalHistoryResponse {
  entries: JournalEntry[]
  total: number
}

// ─── Mood ─────────────────────────────────────────────────────────────────────

export type MoodLevel = 1 | 2 | 3 | 4 | 5
export type StressLevel = 1 | 2 | 3 | 4 | 5

export interface MoodLog {
  log_id: string
  mood: MoodLevel
  stress: StressLevel
  notes?: string
  activities: string[]
  created_at: string
}

export interface MoodHistoryResponse {
  logs: MoodLog[]
  total: number
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface JournalAnalysis {
  entry_id: string
  emotions_detected: string[]
  stress_triggers: string[]
  patterns: string[]
  coping_suggestions: string[]
  mindfulness_exercise: string
  empathy_message: string
  safety_note: string
  sentiment_score: number
  analyzed_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export interface ChatResponse {
  reply: string
  conversation_id: string
  safety_reminder?: string
  timestamp: string
}

export interface WeeklyInsight {
  week_start: string
  week_end: string
  mood_trend: string
  stress_trend: string
  dominant_emotions: string[]
  top_triggers: string[]
  positive_patterns: string[]
  areas_of_concern: string[]
  personalized_recommendations: string[]
  motivational_message: string
  safety_disclaimer: string
  generated_at: string
}

// ─── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  detail: string
  code?: string
}
