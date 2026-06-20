import { useState, useEffect } from 'react'
import { BookOpen, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { journalApi } from '../api/journal'
import { aiApi } from '../api/ai'
import { getErrorMessage } from '../api/client'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import SafetyBanner from '../components/SafetyBanner'
import { formatDistanceToNow } from 'date-fns'
import type { JournalEntry, JournalAnalysis, ExamType } from '../types'

const EXAM_OPTIONS: ExamType[] = ['NEET', 'JEE', 'CUET', 'CAT', 'GATE', 'UPSC', 'OTHER']

function AnalysisCard({ analysis }: { analysis: JournalAnalysis }) {
  return (
    <div className="mt-4 bg-lavender-50 rounded-xl p-4 border border-lavender-100 space-y-3 animate-slide-up">
      <p className="text-sm font-semibold text-lavender-800 flex items-center gap-2">
        <Sparkles className="w-4 h-4" aria-hidden /> AI Analysis
      </p>

      {/* Empathy message */}
      <div className="bg-white rounded-lg p-3">
        <p className="text-sm text-sage-700 italic leading-relaxed">"{analysis.empathy_message}"</p>
      </div>

      {/* Emotions */}
      {analysis.emotions_detected.length > 0 && (
        <div>
          <p className="text-xs font-medium text-sage-600 mb-1.5">Emotions Detected</p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.emotions_detected.map((e) => (
              <span key={e} className="px-2 py-0.5 bg-lavender-100 text-lavender-700 text-xs rounded-full">
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stress triggers */}
      {analysis.stress_triggers.length > 0 && (
        <div>
          <p className="text-xs font-medium text-sage-600 mb-1.5">Stress Triggers</p>
          <ul className="space-y-1">
            {analysis.stress_triggers.map((t) => (
              <li key={t} className="text-xs text-sage-700 flex items-start gap-2">
                <span className="text-red-400 mt-0.5">•</span> {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Coping suggestions */}
      {analysis.coping_suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-sage-600 mb-1.5">Coping Suggestions</p>
          <ul className="space-y-1.5">
            {analysis.coping_suggestions.map((s) => (
              <li key={s} className="text-xs text-sage-700 flex items-start gap-2">
                <span className="text-sage-400 mt-0.5">✦</span> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mindfulness */}
      {analysis.mindfulness_exercise && (
        <div className="bg-sage-50 rounded-lg p-3">
          <p className="text-xs font-medium text-sage-600 mb-1">Mindfulness Exercise</p>
          <p className="text-xs text-sage-700 leading-relaxed">{analysis.mindfulness_exercise}</p>
        </div>
      )}

      {/* Safety note */}
      <p className="text-xs text-sage-400 italic">{analysis.safety_note}</p>
    </div>
  )
}

function EntryCard({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<JournalAnalysis | null>(entry.ai_analysis || null)

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const result = await aiApi.analyzeJournal(entry.entry_id)
      setAnalysis(result)
      toast.success('Journal analyzed by AI!')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <article className="card" aria-label={`Journal entry from ${entry.created_at}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-sage-400">
              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
            </span>
            {entry.exam_type && (
              <span className="px-2 py-0.5 bg-sage-100 text-sage-600 text-xs rounded-full">
                {entry.exam_type}
              </span>
            )}
            {entry.study_hours !== undefined && entry.study_hours !== null && (
              <span className="px-2 py-0.5 bg-calm-50 text-calm-600 text-xs rounded-full">
                {entry.study_hours}h study
              </span>
            )}
          </div>
          <p className={`text-sm text-sage-700 leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
            {entry.content}
          </p>
          {entry.content.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-sage-500 hover:text-sage-700 mt-1 flex items-center gap-1"
              aria-expanded={expanded}
            >
              {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
            </button>
          )}
        </div>
      </div>

      {/* AI analysis section */}
      {analysis ? (
        <AnalysisCard analysis={analysis} />
      ) : (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="mt-3 flex items-center gap-2 text-xs font-medium text-lavender-600 hover:text-lavender-800 bg-lavender-50 hover:bg-lavender-100 px-3 py-2 rounded-lg transition-all"
          aria-label="Analyze this journal entry with AI"
        >
          {analyzing ? (
            <span className="w-3 h-3 border border-lavender-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" aria-hidden />
          )}
          {analyzing ? 'Analyzing...' : 'Analyze with AI'}
        </button>
      )}
    </article>
  )
}

export default function JournalPage() {
  const [content, setContent] = useState('')
  const [examType, setExamType] = useState<ExamType | ''>('')
  const [studyHours, setStudyHours] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [autoAnalyze, setAutoAnalyze] = useState(true)

  const loadEntries = async () => {
    try {
      const res = await journalApi.getHistory(10, 0)
      setEntries(res.entries)
      setTotal(res.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || content.trim().length < 10) {
      toast.error('Please write at least 10 characters.')
      return
    }

    setSubmitting(true)
    try {
      const entry = await journalApi.create(
        content.trim(),
        examType || undefined,
        studyHours ? parseFloat(studyHours) : undefined
      )

      let finalEntry = entry

      // Auto-analyze if enabled
      if (autoAnalyze) {
        try {
          const analysis = await aiApi.analyzeJournal(entry.entry_id)
          finalEntry = { ...entry, ai_analysis: analysis }
          toast.success('Entry saved and analyzed!')
        } catch {
          toast.success('Entry saved! You can analyze it below.')
        }
      } else {
        toast.success('Journal entry saved!')
      }

      setEntries([finalEntry, ...entries])
      setTotal(total + 1)
      setContent('')
      setExamType('')
      setStudyHours('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const charCount = content.length
  const charLimit = 5000

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-sage-900 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-sage-600" aria-hidden /> Daily Journal
        </h1>
        <p className="text-sage-600 mt-1 text-sm">
          Express your thoughts freely. AI will help uncover patterns and offer support.
        </p>
      </div>

      {/* New entry form */}
      <form onSubmit={handleSubmit} className="card space-y-4" aria-label="New journal entry form">
        <div>
          <label htmlFor="journal-content" className="block text-sm font-medium text-sage-700 mb-2">
            How was your day? What's on your mind?
          </label>
          <textarea
            id="journal-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-field resize-none"
            rows={6}
            placeholder="I've been feeling anxious about my NEET preparation today. The organic chemistry section is giving me a hard time..."
            maxLength={charLimit}
            aria-describedby="char-count"
          />
          <div className="flex justify-between mt-1">
            <p id="char-count" className="text-xs text-sage-400">
              {charCount}/{charLimit} characters
            </p>
            {charCount < 10 && charCount > 0 && (
              <p className="text-xs text-red-400">Minimum 10 characters</p>
            )}
          </div>
        </div>

        {/* Optional context */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="exam-type" className="block text-xs font-medium text-sage-600 mb-1">
              Exam (optional)
            </label>
            <select
              id="exam-type"
              value={examType}
              onChange={(e) => setExamType(e.target.value as ExamType | '')}
              className="input-field py-2 text-sm"
            >
              <option value="">Select exam</option>
              {EXAM_OPTIONS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="study-hours" className="block text-xs font-medium text-sage-600 mb-1">
              Study hours today (optional)
            </label>
            <input
              id="study-hours"
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={studyHours}
              onChange={(e) => setStudyHours(e.target.value)}
              className="input-field py-2 text-sm"
              placeholder="e.g. 6"
            />
          </div>
        </div>

        {/* Auto-analyze toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="auto-analyze"
            checked={autoAnalyze}
            onChange={(e) => setAutoAnalyze(e.target.checked)}
            className="w-4 h-4 accent-sage-600"
          />
          <label htmlFor="auto-analyze" className="text-sm text-sage-600">
            Automatically analyze with AI after saving
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting || content.trim().length < 10}
          className="btn-primary flex items-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {autoAnalyze ? 'Saving & Analyzing...' : 'Saving...'}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" aria-hidden />
              Save Entry
            </>
          )}
        </button>
      </form>

      {/* History */}
      <section aria-labelledby="journal-history-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="journal-history-heading" className="text-base font-semibold text-sage-700">
            Journal History {total > 0 && <span className="text-sage-400 font-normal">({total} entries)</span>}
          </h2>
        </div>

        {loading ? (
          <LoadingSpinner label="Loading journal entries..." />
        ) : entries.length === 0 ? (
          <div className="card text-center py-10 text-sage-400">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No entries yet. Write your first one above!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <EntryCard key={entry.entry_id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <SafetyBanner compact />
    </div>
  )
}
