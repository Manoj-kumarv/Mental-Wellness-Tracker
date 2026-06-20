import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  BookOpen,
  Smile,
  MessageCircle,
  BarChart3,
  LogOut,
  Menu,
  X,
  Leaf,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../api/auth'
import { clsx } from 'clsx'

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/journal', label: 'Journal', icon: BookOpen },
  { to: '/app/mood', label: 'Mood Log', icon: Smile },
  { to: '/app/chat', label: 'AI Chat', icon: MessageCircle },
  { to: '/app/insights', label: 'Insights', icon: BarChart3 },
]

export default function Layout() {
  const { user, isGuest, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    } finally {
      clearAuth()
      navigate('/')
    }
  }

  const displayName = isGuest ? 'Guest' : (user?.name || 'User')

  return (
    <div className="min-h-screen flex bg-sage-50">
      {/* ── Sidebar (desktop) ── */}
      <aside
        className="hidden md:flex flex-col w-64 bg-white border-r border-sage-100 fixed h-full"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sage-100">
          <div className="w-9 h-9 bg-sage-500 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" aria-hidden />
          </div>
          <div>
            <p className="font-semibold text-sage-900 text-sm leading-tight">MindEase</p>
            <p className="text-xs text-sage-500">Wellness Tracker</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-sage-100 text-sage-800'
                    : 'text-sage-600 hover:bg-sage-50 hover:text-sage-800'
                )
              }
            >
              <Icon className="w-4 h-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info & logout */}
        <div className="px-3 py-4 border-t border-sage-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-sage-200 rounded-full flex items-center justify-center text-sage-700 font-semibold text-sm">
              {displayName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sage-900 truncate">{displayName}</p>
              <p className="text-xs text-sage-500">{isGuest ? 'Guest session' : 'Member'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-sage-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-150"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" aria-hidden />
            {isGuest ? 'End Session' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-sage-100 z-40 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-sage-500 rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" aria-hidden />
          </div>
          <span className="font-semibold text-sage-900">MindEase</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-sage-600 hover:bg-sage-50"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setMobileOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="bg-white w-64 h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-6 py-5 border-b border-sage-100">
              <div className="w-9 h-9 bg-sage-500 rounded-xl flex items-center justify-center">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-sage-900">MindEase</span>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-sage-100 text-sage-800'
                        : 'text-sage-600 hover:bg-sage-50 hover:text-sage-800'
                    )
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-sage-100">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-sage-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                <LogOut className="w-4 h-4" />
                {isGuest ? 'End Session' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main
        id="main-content"
        className="flex-1 md:ml-64 pt-16 md:pt-0"
        tabIndex={-1}
      >
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
