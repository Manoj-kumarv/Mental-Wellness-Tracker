import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Smile, MessageCircle, BarChart3, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { journalApi } from '../api/journal'
import { moodApi } from '../api/mood'
import { formatDistanceToNow } from 'date-fns'
import LoadingSpinner from '../components/LoadingSpinner'
import SafetyBanner from '../components/SafetyBanner'
import type { JournalEntry, MoodLog } from '../types'

const MOOD_LABELS: Record<number, string> = {
  1: '😔 Very Low',
  2: '😕 Low',
  3: '😐 Neutral',
  4: '🙂 Good',
  5: '😄 Excellent',
}

const STRESS_LABELS: Record<number, string> = {
  1: '🔥 Very High',
  2: '😤 High',
  3: '😓 Moderate',
  4: '😌 Low',
  5: '✨ Minimal',
}

const quickActions = [
  {
    to: '/app/journal',
    icon: BookOpen,
    label: 'New Journal Entry',
    desc: 'Write about your day',
    color: 'bg-calm-50 text-calm-600',
  },
  {
    to: '/app/mood',
    icon: Smile,
    label: 'Log Mood',
    desc: 'How are you feeling?',
    color: 'bg-warm-50 text-warm-600',
  },
  {
    to: '/app/chat',
    icon: MessageCircle,
    label: 'Talk to MindEase',
    desc: 'AI companion chat',
    color: 'bg-lavender-50 text-lavender-600',
  },
  {
    to: '/app/insights',
    icon: BarChart3,
    label: 'Weekly Insights',
    desc: 'Your wellness trends',
    color: 'bg-sage-50 text-sage-600',
  },
]

export default function DashboardPage() {
  const { user, isGuest } = useAuthStore()
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([])
  const [recentMoods, setRecentMoods] = useState<MoodLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [journalRes, moodRes] = await Promise.all([
          journalApi.getHistory(3, 0),
          moodApi.getHistory(5, 0),
        ])
        setRecentEntries(journalRes.entries)
        setRecentMoods(moodRes.logs)
      } catch {
        // Silently fail — new users won't have data
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const avgMood =
    recentMoods.length > 0
      ? recentMoods.reduce((acc, l) => acc + l.mood, 0) / recentMoods.length
      : null

  const moodTrend = () => {
    if (recentMoods.length < 2) return null
    const diff = recentMoods[0].mood - recentMoods[recentMoods.length - 1].mood
    if (diff > 0.5) return 'up'
    if (diff < -0.5) return 'down'
    return 'stable'
  }

  const trend = moodTrend()

  const displayName = isGuest ? 'Explorer' : (user?.name?.split(' ')[0] || 'there')

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner label="Loading your dashboard..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-sage-900">
          Hello, {displayName} 👋
        </h1>
        <p className="text-sage-600 mt-1">
          {isGuest
            ? 'You have full access as a guest. Your data is private to this session.'
            : 'How are you doing today? Take a moment for yourself.'}
        </p>
      </div>

      {/* Mood snapshot */}
      {recentMoods.length > 0 && (
        <div className="card bg-gradient-to-br from-sage-50 to-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-sage-500 mb-1">Latest Mood</p>
              <p className="text-2xl font-bold text-sage-900">
                {MOOD_LABELS[recentMoods[0].mood]}
              </p>
              <p className="text-sm text-sage-600 mt-1">
                Stress: {STRESS_LABELS[recentMoods[0].stress]}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {trend && (
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    trend === 'up' ? 'text-sage-600' : trend === 'down' ? 'text-red-500' : 'text-sage-400'
                  }`}
                  aria-label={`Mood trend: ${trend}`}
                >
                  {trend === 'up' && <TrendingUp className="w-4 h-4" />}
                  {trend === 'down' && <TrendingDown className="w-4 h-4" />}
                  {trend === 'stable' && <Minus className="w-4 h-4" />}
                  <span>{trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}</span>
                </div>
              )}
              <p className="text-xs text-sage-400">
                {formatDistanceToNow(new Date(recentMoods[0].created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {avgMood !== null && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-sage-500 mb-1">
                <span>5-day avg mood</span>
                <span>{avgMood.toFixed(1)}/5</span>
              </div>
              <div className="h-2 bg-sage-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage-500 rounded-full transition-all duration-500"
                  style={{ width: `${(avgMood / 5) * 100}%` }}
                  role="progressbar"
                  aria-valuenow={Math.round(avgMood * 10) / 10}
                  aria-valuemin={1}
                  aria-valuemax={5}
                  aria-label={`Average mood ${avgMood.toFixed(1)} out of 5`}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="text-base font-semibold text-sage-700 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map(({ to, icon: Icon, label, desc, color }) => (
            <Link
              key={to}
              to={to}
              className="card-hover flex flex-col gap-3"
              aria-label={label}
            >
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                <Icon className="w-5 h-5" aria-hidden />
              </div>
              <div>
                <p className="font-medium text-sage-900 text-sm">{label}</p>
                <p className="text-xs text-sage-500 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent journal entries */}
      {recentEntries.length > 0 && (
        <section aria-labelledby="recent-journal-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="recent-journal-heading" className="text-base font-semibold text-sage-700">
              Recent Journal Entries
            </h2>
            <Link
              to="/app/journal"
              className="text-sm text-sage-600 hover:text-sage-800 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" aria-hidden />
            </Link>
          </div>
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <div key={entry.entry_id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-sage-700 leading-relaxed line-clamp-2">
                    {entry.content}
                  </p>
                  <span className="text-xs text-sage-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </span>
                </div>
                {entry.exam_type && (
                  <span className="mt-2 inline-block px-2 py-0.5 bg-sage-100 text-sage-600 text-xs rounded-full">
                    {entry.exam_type}
                  </span>
                )}
                {entry.ai_analysis && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.ai_analysis.emotions_detected.slice(0, 3).map((e) => (
                      <span
                        key={e}
                        className="px-2 py-0.5 bg-lavender-50 text-lavender-700 text-xs rounded-full"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {recentEntries.length === 0 && recentMoods.length === 0 && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-sage-400" aria-hidden />
          </div>
          <h3 className="font-semibold text-sage-800 mb-2">Start Your Wellness Journey</h3>
          <p className="text-sm text-sage-500 mb-6 max-w-xs mx-auto">
            Write your first journal entry or log your mood to see AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/app/journal" className="btn-primary">
              Write First Journal
            </Link>
            <Link to="/app/mood" className="btn-secondary">
              Log Your Mood
            </Link>
          </div>
        </div>
      )}

      {/* Safety footer */}
      <SafetyBanner compact />
    </div>
  )
}
