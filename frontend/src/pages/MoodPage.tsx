import { useState, useEffect } from 'react'
import { Smile } from 'lucide-react'
import { moodApi } from '../api/mood'
import { getErrorMessage } from '../api/client'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import SafetyBanner from '../components/SafetyBanner'
import { formatDistanceToNow } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { MoodLog, MoodLevel, StressLevel } from '../types'

const MOOD_OPTIONS = [
  { value: 1, emoji: '😔', label: 'Very Low' },
  { value: 2, emoji: '😕', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Neutral' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Excellent' },
]

const STRESS_OPTIONS = [
  { value: 1, emoji: '🔥', label: 'Very High' },
  { value: 2, emoji: '😤', label: 'High' },
  { value: 3, emoji: '😓', label: 'Moderate' },
  { value: 4, emoji: '😌', label: 'Low' },
  { value: 5, emoji: '✨', label: 'Minimal' },
]

const ACTIVITIES = [
  'Studied', 'Exercised', 'Meditated', 'Took a break', 'Slept well',
  'Ate well', 'Talked to someone', 'Practiced problems', 'Revision', 'Mock test',
]

export default function MoodPage() {
  const [mood, setMood] = useState<MoodLevel | null>(null)
  const [stress, setStress] = useState<StressLevel | null>(null)
  const [notes, setNotes] = useState('')
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [logs, setLogs] = useState<MoodLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadLogs = async () => {
    try {
      const res = await moodApi.getHistory(14, 0)
      setLogs(res.logs)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const toggleActivity = (activity: string) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mood || !stress) {
      toast.error('Please select both mood and stress level.')
      return
    }

    setSubmitting(true)
    try {
      const log = await moodApi.log(mood, stress, notes || undefined, selectedActivities)
      setLogs([log, ...logs])
      setMood(null)
      setStress(null)
      setNotes('')
      setSelectedActivities([])
      toast.success('Mood logged!')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Prepare chart data (reversed for chronological order)
  const chartData = [...logs]
    .reverse()
    .slice(-10)
    .map((log) => ({
      date: new Date(log.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      Mood: log.mood,
      'Calm (Inverse Stress)': log.stress, // higher = calmer
    }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-sage-900 flex items-center gap-2">
          <Smile className="w-6 h-6 text-sage-600" aria-hidden /> Mood Log
        </h1>
        <p className="text-sage-600 mt-1 text-sm">
          Track how you feel daily to see patterns and get better insights.
        </p>
      </div>

      {/* Log form */}
      <form onSubmit={handleSubmit} className="card space-y-5" aria-label="Mood logging form">
        {/* Mood selector */}
        <div>
          <p className="text-sm font-medium text-sage-700 mb-3">
            How's your mood right now?
          </p>
          <div className="flex gap-2" role="radiogroup" aria-label="Mood level">
            {MOOD_OPTIONS.map(({ value, emoji, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mood === value}
                onClick={() => setMood(value as MoodLevel)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all duration-200 ${
                  mood === value
                    ? 'border-sage-500 bg-sage-50'
                    : 'border-sage-100 hover:border-sage-300'
                }`}
                aria-label={`Mood: ${label}`}
              >
                <span className="text-2xl" role="img" aria-label={label}>{emoji}</span>
                <span className="text-xs text-sage-600 font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stress selector */}
        <div>
          <p className="text-sm font-medium text-sage-700 mb-3">
            What's your stress level?
          </p>
          <div className="flex gap-2" role="radiogroup" aria-label="Stress level">
            {STRESS_OPTIONS.map(({ value, emoji, label }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={stress === value}
                onClick={() => setStress(value as StressLevel)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-all duration-200 ${
                  stress === value
                    ? 'border-red-300 bg-red-50'
                    : 'border-sage-100 hover:border-sage-300'
                }`}
                aria-label={`Stress: ${label}`}
              >
                <span className="text-2xl" role="img" aria-label={label}>{emoji}</span>
                <span className="text-xs text-sage-600 font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Activities */}
        <div>
          <p className="text-sm font-medium text-sage-700 mb-2">What did you do today?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Today's activities">
            {ACTIVITIES.map((activity) => (
              <button
                key={activity}
                type="button"
                aria-pressed={selectedActivities.includes(activity)}
                onClick={() => toggleActivity(activity)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                  selectedActivities.includes(activity)
                    ? 'bg-sage-600 text-white border-sage-600'
                    : 'bg-white text-sage-600 border-sage-200 hover:border-sage-400'
                }`}
              >
                {activity}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="mood-notes" className="block text-sm font-medium text-sage-700 mb-1.5">
            Any notes? (optional)
          </label>
          <textarea
            id="mood-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input-field resize-none"
            rows={2}
            placeholder="Quick thought or note about your day..."
            maxLength={500}
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !mood || !stress}
          className="btn-primary flex items-center gap-2"
        >
          {submitting && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          Save Mood Log
        </button>
      </form>

      {/* Chart */}
      {chartData.length >= 2 && (
        <section className="card" aria-labelledby="mood-chart-heading">
          <h2 id="mood-chart-heading" className="text-sm font-semibold text-sage-700 mb-4">
            Mood & Calm Trend (Last 10 logs)
          </h2>
          <div className="h-48" role="img" aria-label="Line chart showing mood and calm trends over time">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e3ebe3" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6d976f' }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: '#6d976f' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #c6d7c7',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="Mood"
                  stroke="#4a7a4d"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#4a7a4d' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Calm (Inverse Stress)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#8b5cf6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* History */}
      <section aria-labelledby="mood-history-heading">
        <h2 id="mood-history-heading" className="text-base font-semibold text-sage-700 mb-3">
          Recent Logs
        </h2>

        {loading ? (
          <LoadingSpinner label="Loading mood logs..." />
        ) : logs.length === 0 ? (
          <div className="card text-center py-8 text-sage-400 text-sm">
            No logs yet. Log your mood above!
          </div>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 10).map((log) => (
              <div key={log.log_id} className="card flex items-center gap-4 py-3">
                <div className="text-2xl" aria-hidden>
                  {MOOD_OPTIONS.find((m) => m.value === log.mood)?.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-sage-800">
                      Mood: {MOOD_OPTIONS.find((m) => m.value === log.mood)?.label}
                    </span>
                    <span className="text-xs text-sage-400">·</span>
                    <span className="text-sm text-sage-600">
                      Stress: {STRESS_OPTIONS.find((s) => s.value === log.stress)?.label}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-sage-500 mt-0.5 line-clamp-1">{log.notes}</p>
                  )}
                  {log.activities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {log.activities.map((a) => (
                        <span key={a} className="px-1.5 py-0.5 bg-sage-50 text-sage-500 text-xs rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-sage-400 flex-shrink-0">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <SafetyBanner compact />
    </div>
  )
}
