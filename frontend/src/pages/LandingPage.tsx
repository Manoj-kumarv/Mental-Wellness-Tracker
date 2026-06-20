import { useNavigate } from 'react-router-dom'
import { Leaf, Brain, Heart, TrendingUp, MessageCircle, Shield, ArrowRight, Star } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/auth'
import { useState } from 'react'
import { getErrorMessage } from '../api/client'
import toast from 'react-hot-toast'
import SafetyBanner from '../components/SafetyBanner'

const features = [
  {
    icon: Brain,
    title: 'AI Journal Analysis',
    desc: 'AWS Bedrock AI reads your daily entries to uncover hidden stress triggers and emotional patterns.',
  },
  {
    icon: Heart,
    title: 'Mood & Stress Tracker',
    desc: 'Log how you feel daily — visualize trends over time to spot warning signs early.',
  },
  {
    icon: MessageCircle,
    title: 'Empathetic AI Chat',
    desc: 'Talk to MindEase anytime. Context-aware responses, grounded in your actual data.',
  },
  {
    icon: TrendingUp,
    title: 'Weekly Insights',
    desc: 'AI-generated weekly summaries of your emotional health with personalized recommendations.',
  },
]

const exams = ['NEET', 'JEE', 'CUET', 'CAT', 'GATE', 'UPSC']

export default function LandingPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { setGuest } = useAuthStore()
  const [loading, setLoading] = useState(false)

  // If already logged in, redirect to app
  if (token) {
    navigate('/app', { replace: true })
    return null
  }

  const handleGuestAccess = async () => {
    setLoading(true)
    try {
      const res = await authApi.guestSession()
      setGuest(res.token, res.session_id)
      toast.success('Welcome! You have guest access to all features.')
      navigate('/app')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-50 via-white to-lavender-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sage-500 rounded-xl flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" aria-hidden />
          </div>
          <span className="font-semibold text-sage-900">MindEase</span>
        </div>
        <button
          onClick={() => navigate('/auth')}
          className="btn-secondary py-2 px-4 text-sm"
        >
          Sign In
        </button>
      </header>

      {/* Hero */}
      <main id="main-content">
        <section className="container mx-auto px-4 py-16 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-sage-100 text-sage-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4" aria-hidden />
            Built for NEET · JEE · CUET · CAT · GATE · UPSC students
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-sage-900 leading-tight mb-6">
            Your Mental Wellness{' '}
            <span className="text-sage-600">Companion</span>{' '}
            Through Every Exam
          </h1>

          <p className="text-lg text-sage-700 mb-8 leading-relaxed">
            AI-powered journaling, mood tracking, and empathetic support — designed for the
            unique pressures of competitive exam preparation.
          </p>

          {/* Exam tags */}
          <div className="flex flex-wrap justify-center gap-2 mb-10" aria-label="Supported exams">
            {exams.map((exam) => (
              <span
                key={exam}
                className="px-3 py-1 bg-white border border-sage-200 rounded-full text-sm font-medium text-sage-700"
              >
                {exam}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            {/* Primary: Guest access — 1 click */}
            <button
              onClick={handleGuestAccess}
              disabled={loading}
              className="btn-primary flex items-center gap-2 text-base w-full sm:w-auto"
              aria-label="Continue as guest — no signup required"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" aria-hidden />
              )}
              Continue as Guest — No Signup
            </button>

            <button
              onClick={() => navigate('/auth')}
              className="btn-secondary flex items-center gap-2 text-base w-full sm:w-auto"
            >
              Create Free Account
            </button>
          </div>

          <p className="text-sm text-sage-500">
            Guest users get full access — no email or password required.
          </p>
        </section>

        {/* Safety Disclaimer — prominent */}
        <section className="container mx-auto px-4 mb-12 max-w-2xl">
          <SafetyBanner />
        </section>

        {/* Features */}
        <section className="container mx-auto px-4 pb-16 max-w-5xl" aria-labelledby="features-heading">
          <h2 id="features-heading" className="text-2xl font-bold text-sage-900 text-center mb-10">
            Everything you need to stay well while you study
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card text-center">
                <div className="w-12 h-12 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-sage-600" aria-hidden />
                </div>
                <h3 className="font-semibold text-sage-900 mb-2">{title}</h3>
                <p className="text-sm text-sage-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-sage-900 text-white py-16" aria-labelledby="how-heading">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 id="how-heading" className="text-2xl font-bold mb-4">
              Powered by AWS Bedrock AI
            </h2>
            <p className="text-sage-300 mb-8 leading-relaxed">
              MindEase uses real-time AWS Bedrock inference to analyze your journal entries, detect
              emotional patterns, and generate personalized wellness insights — not canned
              responses, but truly personalized support.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-5 h-5 text-sage-400" aria-hidden />
              <span className="text-sm text-sage-400">
                Your data is private, isolated per session, and never shared.
              </span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 text-center">
          <p className="text-sm text-sage-500">
            © 2024 MindEase · Powered by AWS Bedrock ·{' '}
            <span className="font-medium">Not a medical tool</span>
          </p>
        </footer>
      </main>
    </div>
  )
}
