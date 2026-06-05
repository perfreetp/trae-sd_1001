import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Plane, Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout } = useAppStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const isAdmin = location.pathname.startsWith('/admin')

  const touristLinks = [
    { to: '/', label: '首页' },
    { to: '/orders', label: '我的订单' },
    { to: '/review/0', label: '评价与客服' },
  ]

  const adminLinks = [
    { to: '/admin/schedule', label: '排班管理' },
    { to: '/admin/statistics', label: '收入统计' },
  ]

  const links = isAdmin ? adminLinks : touristLinks

  const handleLogout = () => {
    logout()
    navigate('/')
    setMenuOpen(false)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to={isAdmin ? '/admin/schedule' : '/'} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl gradient-sky flex items-center justify-center shadow-lg shadow-sky-200 group-hover:shadow-sky-300 transition-shadow">
              <Plane className="w-5 h-5 text-white" />
            </div>
            <span className="font-serif-sc text-xl font-semibold text-deep">云览山海</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  location.pathname === link.to
                    ? 'text-sky-start bg-sky-50'
                    : 'text-rock hover:text-sky-start hover:bg-sky-50/50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {user.role !== 'admin' && (
                  <Link to="/admin/schedule" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-rock hover:text-deep hover:bg-gray-50 transition">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    管理后台
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-rock hover:text-deep hover:bg-gray-50 transition">
                    游客端
                  </Link>
                )}
                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                  <div className="w-8 h-8 rounded-full gradient-sky flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-deep font-medium">{user.name || user.phone}</span>
                  <button onClick={handleLogout} className="p-1.5 rounded-lg text-rock hover:text-red-500 hover:bg-red-50 transition">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <Link to="/login" className="px-5 py-2 rounded-xl gradient-sky text-white text-sm font-medium shadow-lg shadow-sky-200 hover:shadow-sky-300 transition-all hover:scale-105 active:scale-95">
                登录
              </Link>
            )}
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition">
            {menuOpen ? <X className="w-5 h-5 text-rock" /> : <Menu className="w-5 h-5 text-rock" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden glass-card border-t border-white/20 animate-fade-in-up">
          <div className="px-4 py-3 space-y-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  location.pathname === link.to
                    ? 'text-sky-start bg-sky-50'
                    : 'text-rock hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-gray-100">
              {user ? (
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-xl transition w-full">
                  <LogOut className="w-4 h-4" />
                  退出登录
                </button>
              ) : (
                <Link to="/login" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-sky-start hover:bg-sky-50 rounded-xl transition">
                  登录
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
