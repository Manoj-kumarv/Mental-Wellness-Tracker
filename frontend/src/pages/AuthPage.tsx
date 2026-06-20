import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Leaf, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/auth'
import { getErrorMessage } from '../api/client'
import toast from 'react-hot-toast'
import SafetyBanner from '../components/SafetyBanner'

type Mode = 'login' | 'signup'

export default function AuthPage() {
  const navigate = useNavigate()
  const { setAuth, setGuest } = useAuthStore()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (mode === 'signup') {
        const res = await authApi.signup(form.email, form.password, form.name)
        setAuth(res.access_token, {
          user_id: res.user_id,
          user_type: res.user_type,
          name: res.name,
          created_at: new Date().toISOString(),
        })
        toast.success(`Welcome, ${res.name}! Your account is ready.`)
      } else {
        const res = await authApi.login(form.email, form.password)
        setAuth(res.access_token, {
          user_id: res.user_id,
          user_type: res.user_type,
          name: res.name,
          created_at: new Date().toISOString(),
        })
        toast.success(`Welcome back, ${res.name}!`)
      }
      navigate('/app')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    setGuestLoading(true)
    try {
      const res = await authApi.guestSession()
      setGuest(res.token, res.session_id)
      toast.success('Guest session started — full access enabled!')
      navigate('/app')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setGuestLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-sage-50">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center items-center w-1/2 bg-sage-900 text-white p-12">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 bg-sage-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Leaf className="w-8 h-8 text-white" aria-hidden />
          </div>
          <h1 className="text-3xl font-bold mb-4">MindEase</h1>
          <p className="text-sage-300 leading-relaxed mb-8">
            Your AI-powered mental wellness companion for NEET, JEE, CUET, CAT, GATE, and UPSC
            preparation.
          </p>
          <div className="space-y-3 text-left">
            {[
              'AI journal analysis with Gemini',
              'Mood & stress pattern tracking',
              'Empathetic 24/7 chat support',
              'Weekly wellness insights',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-sage-300">
                <div className="w-5 h-5 bg-sage-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <main id="main-content" className="flex-1 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-sage-500 rounded-xl flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sage-900">MindEase</span>
          </div>

          <h2 className="text-2xl font-bold text-sage-900 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sage-600 mb-6 text-sm">
            {mode === 'login'
              ? 'Sign in to continue your wellness journey'
              : 'Start tracking your mental wellness today'}
          </p>

          {/* Guest CTA — prominent */}
          <button
            onClick={handleGuest}
            disabled={guestLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-lavender-50 border-2 border-lavender-200 text-lavender-700 rounded-xl font-medium text-sm hover:bg-lavender-100 transition-all duration-200 mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavender-400"
            aria-label="Continue without an account"
          >
            {guestLoading ? (
              <span className="w-4 h-4 border-2 border-lavender-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" aria-hidden />
            )}
            Continue as Guest — No Account Needed
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-sage-200" />
            <span className="text-xs text-sage-400">or sign in / create account</span>
            <div className="flex-1 h-px bg-sage-200" />
          </div>

          {/* Mode toggle */}
          <div className="flex bg-sage-100 p-1 rounded-xl mb-6" role="tablist">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === m
                    ? 'bg-white text-sage-900 shadow-sm'
                    : 'text-sage-600 hover:text-sage-800'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {mode === 'signup' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-sage-700 mb-1.5">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  className="input-field"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-sage-700 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-sage-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  className="input-field pr-12"
                  placeholder={mode === 'signup' ? 'Min 8 chars, 1 uppercase, 1 digit' : 'Your password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sage-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6">
            <SafetyBanner compact />
          </div>

          <p className="text-center text-sm text-sage-500 mt-4">
            <Link to="/" className="text-sage-600 hover:text-sage-800 underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
