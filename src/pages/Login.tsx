import { useNavigate } from 'react-router-dom'
import { Phone, Lock, ArrowRight, Plane } from 'lucide-react'
import { useState } from 'react'
import { useAppStore, apiFetch } from '@/store/useAppStore'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser, setToken } = useAppStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const url = isRegister ? '/api/auth/register' : '/api/auth/login'
      const body = isRegister ? { phone, password, name } : { phone, password }
      const res = await apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      if (res.success && res.data) {
        setToken(res.data.token)
        const meRes = await apiFetch('/api/auth/me')
        if (meRes.success && meRes.data) {
          setUser(meRes.data)
          navigate(res.data.role === 'admin' ? '/admin/schedule' : '/')
        }
      } else {
        setError(res.error || '操作失败')
      }
    } catch {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (phoneNum: string, pwd: string) => {
    setError('')
    setLoading(true)
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone: phoneNum, password: pwd }),
      })
      if (res.success && res.data) {
        setToken(res.data.token)
        const meRes = await apiFetch('/api/auth/me')
        if (meRes.success && meRes.data) {
          setUser(meRes.data)
          navigate(res.data.role === 'admin' ? '/admin/schedule' : '/')
        }
      } else {
        setError(res.error || '登录失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-sky flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-20 left-10 w-32 h-16 bg-white/20 rounded-full blur-xl animate-cloud" />
      <div className="absolute top-40 right-20 w-24 h-12 bg-white/10 rounded-full blur-lg animate-cloud-slow" />
      <div className="absolute bottom-32 left-1/4 w-40 h-20 bg-white/10 rounded-full blur-xl animate-cloud" />

      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <Plane className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-serif-sc text-3xl font-bold text-white mb-2">云览山海</h1>
          <p className="text-white/80 text-sm">低空游览预约平台</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-deep mb-6">{isRegister ? '注册账号' : '欢迎回来'}</h2>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-rock mb-1.5">姓名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入真实姓名"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-start focus:ring-2 focus:ring-sky-100 outline-none transition text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-rock mb-1.5">手机号</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rock" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-sky-start focus:ring-2 focus:ring-sky-100 outline-none transition text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-rock mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rock" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-sky-start focus:ring-2 focus:ring-sky-100 outline-none transition text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-sky text-white font-medium shadow-lg shadow-sky-200 hover:shadow-sky-300 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? '请稍候...' : <> {isRegister ? '注册' : '登录'} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setIsRegister(!isRegister); setError('') }} className="text-sm text-sky-start hover:underline">
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-rock text-center mb-3">快捷登录（演示用）</p>
            <div className="flex gap-2">
              <button
                onClick={() => quickLogin('13800001111', '123456')}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-xs text-rock hover:bg-sky-50 hover:border-sky-200 transition"
              >
                游客·张三
              </button>
              <button
                onClick={() => quickLogin('13900009999', 'admin123')}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-xs text-rock hover:bg-sky-50 hover:border-sky-200 transition"
              >
                管理员
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
