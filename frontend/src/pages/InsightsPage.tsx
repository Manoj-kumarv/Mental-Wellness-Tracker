import { useState, useEffect } from 'react'
import { BarChart3, RefreshCw, TrendingUp, TrendingDown, Minus, Sparkles, ShieldAlert } from 'lucide-react'
import { aiApi } from '../api/ai'
import { getErrorMessage } from '../api/client'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import type { WeeklyInsight } from '../types'
import { format } from 'date-fns'

function TrendBadge({ trend }: { trend: string }) {
  const lower = trend.toLowerCase()
  if (lower.includes('improv') || lower.includes('decreas') || lower.includes('better')) {
    return (
      <span className="inline-flex items-center gap-1 text-sage-600 bg-sage-50 px-2 py-0.5 rounded-full text-xs font-medium">
        <TrendingUp className="w-3 h-3" /> Improving
      </span>
    )
  }
  if (lower.includes('declin') || lower.includes('increas') || lower.includes('worsen')) {
    return (
      <span className="inline-flex items-center gap-1 text-red-500 bg-red-50 px-2 py-0.5 rounded-full text-xs font-medium">
        <TrendingDown className="w-3 h-3" /> Needs Attention
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-sage-400 bg-sage-50 px-2 py-0.5 rounded-full text-xs font-medium">
      <Minus className="w-3 h-3" /> Stable
    </span>
  )
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<WeeklyInsight | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadInsights = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await aiApi.getWeeklyInsights()
      setInsights(data)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadInsights()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <LoadingSpinner size="lg" label="Generating your weekly insights with Gemini AI..." />
        <p className="text-xs text-sage-400 text-center max-w-xs">
          This may take a moment — AI is analyzing your journal entries and mood patterns.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sage-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sage-600" aria-hidden /> Weekly Insights
          </h1>
          <p className="text-sage-600 text-sm mt-1">
            AI-generated analysis of your past 7 days
          </p>
        </div>
        <button
          onClick={() => loadInsights(true)}
          disabled={refreshing}
          className="btn-secondary py-2 px-3 text-sm flex items-center gap-2"
          aria-label="Refresh insights"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {insights && (
        <>
          {/* Date range */}
          <p className="text-xs text-sage-400">
            Analysis period:{' '}
            {format(new Date(insights.week_start), 'MMM d')} —{' '}
            {format(new Date(insights.week_end), 'MMM d, yyyy')}
          </p>

          {/* Motivational message */}
          <div className="card bg-gradient-to-br from-sage-50 to-lavender-50 border-sage-200">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-sage-500 flex-shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-sage-800 mb-1">A message for you</p>
                <p className="text-sm text-sage-700 leading-relaxed italic">
                  "{insights.motivational_message}"
                </p>
              </div>
            </div>
          </div>

          {/* Trends */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <p className="text-xs font-medium text-sage-500 mb-2">Mood Trend</p>
              <TrendBadge trend={insights.mood_trend} />
              <p className="text-xs text-sage-600 mt-2 leading-relaxed">{insights.mood_trend}</p>
            </div>
            <div className="card">
              <p className="text-xs font-medium text-sage-500 mb-2">Stress Trend</p>
              <TrendBadge trend={insights.stress_trend} />
              <p className="text-xs text-sage-600 mt-2 leading-relaxed">{insights.stress_trend}</p>
            </div>
          </div>

          {/* Dominant emotions */}
          {insights.dominant_emotions.length > 0 && (
            <section className="card" aria-labelledby="emotions-heading">
              <h2 id="emotions-heading" className="text-sm font-semibold text-sage-700 mb-3">
                Dominant Emotions This Week
              </h2>
              <div className="flex flex-wrap gap-2">
                {insights.dominant_emotions.map((emotion) => (
                  <span
                    key={emotion}
                    className="px-3 py-1.5 bg-lavender-50 text-lavender-700 border border-lavender-100 rounded-full text-sm font-medium"
                  >
                    {emotion}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Stress triggers */}
          {insights.top_triggers.length > 0 && (
            <section className="card" aria-labelledby="triggers-heading">
              <h2 id="triggers-heading" className="text-sm font-semibold text-sage-700 mb-3">
                Top Stress Triggers
              </h2>
              <ul className="space-y-2">
                {insights.top_triggers.map((trigger) => (
                  <li key={trigger} className="flex items-start gap-2 text-sm text-sage-700">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
                    {trigger}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Positive patterns */}
          {insights.positive_patterns.length > 0 && (
            <section className="card" aria-labelledby="positive-heading">
              <h2 id="positive-heading" className="text-sm font-semibold text-sage-700 mb-3">
                Positive Patterns
              </h2>
              <ul className="space-y-2">
                {insights.positive_patterns.map((pattern) => (
                  <li key={pattern} className="flex items-start gap-2 text-sm text-sage-700">
                    <span className="text-sage-500 mt-0.5 flex-shrink-0">✦</span>
                    {pattern}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Areas of concern */}
          {insights.areas_of_concern.length > 0 && (
            <section className="card border-amber-100 bg-amber-50" aria-labelledby="concerns-heading">
              <h2 id="concerns-heading" className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" aria-hidden /> Areas to Watch
              </h2>
              <ul className="space-y-2">
                {insights.areas_of_concern.map((concern) => (
                  <li key={concern} className="flex items-start gap-2 text-sm text-amber-700">
                    <span className="mt-0.5 flex-shrink-0">•</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Recommendations */}
          {insights.personalized_recommendations.length > 0 && (
            <section className="card" aria-labelledby="recs-heading">
              <h2 id="recs-heading" className="text-sm font-semibold text-sage-700 mb-3">
                Personalized Recommendations for Next Week
              </h2>
              <ol className="space-y-3" role="list">
                {insights.personalized_recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-sage-700">
                    <span className="w-6 h-6 bg-sage-100 text-sage-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 bg-sage-50 rounded-xl p-4">
            <ShieldAlert className="w-4 h-4 text-sage-400 flex-shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-sage-500 leading-relaxed">{insights.safety_disclaimer}</p>
          </div>
        </>
      )}
    </div>
  )
}
