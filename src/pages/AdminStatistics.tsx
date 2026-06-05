import { useNavigate } from 'react-router-dom'
import { TrendingUp, DollarSign, ShoppingCart, RotateCcw, PieChart as PieIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, useAppStore } from '@/store/useAppStore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'

interface Stats {
  summary: {
    totalRevenue: number
    totalOrders: number
    paidOrders: number
    refundedAmount: number
  }
  dailyRevenue: { date: string; revenue: number; count: number }[]
  routeRevenue: { name: string; revenue: number; count: number }[]
  packageRevenue: { name: string; revenue: number; count: number }[]
}

const COLORS = ['#0EA5E9', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444']

export default function AdminStatistics() {
  const { user, token } = useAppStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    if (user && user.role !== 'admin') { navigate('/login'); return }
    if (!user) return
    apiFetch('/api/admin/statistics').then((res) => {
      if (res.success && res.data) setStats(res.data)
    })
  }, [user])

  if (!stats) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-sky-start border-t-transparent rounded-full" /></div>

  const { summary, dailyRevenue, routeRevenue, packageRevenue } = stats

  return (
    <div className="min-h-screen bg-cloud pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-serif-sc text-2xl font-bold text-deep mb-6">收入统计</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl gradient-sky flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm text-rock">总收入</span>
            </div>
            <p className="text-2xl font-bold text-deep">¥{summary.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-rock">总订单</span>
            </div>
            <p className="text-2xl font-bold text-deep">{summary.totalOrders}</p>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-rock">已支付订单</span>
            </div>
            <p className="text-2xl font-bold text-deep">{summary.paidOrders}</p>
          </div>
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm text-rock">退款金额</span>
            </div>
            <p className="text-2xl font-bold text-deep">¥{summary.refundedAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm">
            <h3 className="font-semibold text-deep mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-start" /> 收入趋势
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `¥${v}`} />
                  <Tooltip formatter={(value: number) => [`¥${value}`, '收入']} />
                  <Line type="monotone" dataKey="revenue" stroke="#0EA5E9" strokeWidth={2.5} dot={{ r: 4, fill: '#0EA5E9' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h3 className="font-semibold text-deep mb-4 flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-sky-start" /> 航线收入占比
            </h3>
            {routeRevenue.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={routeRevenue} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {routeRevenue.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`¥${value}`, '收入']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-2">
                  {routeRevenue.map((r, i) => (
                    <div key={r.name} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {r.name}
                      </span>
                      <span className="text-rock">¥{r.revenue} ({r.count}单)</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-48 flex items-center justify-center text-rock text-sm">暂无数据</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h3 className="font-semibold text-deep mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-sky-start" /> 套餐销售统计
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={packageRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `¥${v}`} />
                <Tooltip formatter={(value: number) => [`¥${value}`, '收入']} />
                <Bar dataKey="revenue" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
