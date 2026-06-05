import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, Wind, AlertTriangle, CheckCircle, XCircle, ChevronLeft, ChevronRight, Eye, MessageCircle, Send } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { apiFetch, useAppStore } from '@/store/useAppStore'

interface Schedule {
  id: number
  route_id: number
  route_name: string
  flight_date: string
  time_slot: string
  total_seats: number
  available_seats: number
  is_flyable: number
  weather_remark: string
}

interface Route {
  id: number
  name: string
  type: string
  max_passengers: number
}

interface AdminOrder {
  id: number
  order_no: string
  route_name: string
  package_name: string
  user_name: string
  user_phone: string
  flight_date: string
  time_slot: string
  seat_no: string
  passenger_name: string
  final_price: number
  status: string
  created_at: string
}

export default function AdminSchedule() {
  const { user, token } = useAppStore()
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [activeTab, setActiveTab] = useState<'schedule' | 'orders' | 'chats'>('schedule')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [orderFilter, setOrderFilter] = useState('')
  const [chatUsers, setChatUsers] = useState<any[]>([])
  const [selectedChatUser, setSelectedChatUser] = useState<number | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatReply, setChatReply] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [showPhotoUpload, setShowPhotoUpload] = useState<number | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    if (user && user.role !== 'admin') { navigate('/login'); return }
    if (!user) return

    apiFetch('/api/routes').then((res) => {
      if (res.success && res.data) setRoutes(res.data)
    })
    loadData()
  }, [selectedDate, selectedRoute, user])

  const loadData = async () => {
    let scheduleUrl = '/api/admin/schedule?'
    if (selectedDate) scheduleUrl += `date=${selectedDate}`
    if (selectedRoute) scheduleUrl += `&route_id=${selectedRoute}`

    const res = await apiFetch(scheduleUrl)
    if (res.success && res.data) setSchedules(res.data)

    const orderRes = await apiFetch('/api/admin/orders')
    if (orderRes.success && orderRes.data) setOrders(orderRes.data)
  }

  const toggleFlyable = async (scheduleId: number, isFlyable: boolean) => {
    const res = await apiFetch('/api/admin/fly-status', {
      method: 'PUT',
      body: JSON.stringify({ schedule_id: scheduleId, is_flyable: !isFlyable, weather_remark: !isFlyable ? '天气好转，恢复飞行' : '风力偏大，暂停飞行' }),
    })
    if (res.success) loadData()
  }

  const deleteSchedule = async (id: number) => {
    if (!confirm('确认删除此排班？')) return
    const res = await apiFetch(`/api/admin/schedule/${id}`, { method: 'DELETE' })
    if (res.success) loadData()
    else alert(res.error)
  }

  const [formData, setFormData] = useState({
    route_id: 1,
    flight_date: '',
    time_slot: '08:00-08:30',
    total_seats: 4,
    is_flyable: true,
    weather_remark: '',
  })

  const handleAddSchedule = async () => {
    const res = await apiFetch('/api/admin/schedule', {
      method: 'POST',
      body: JSON.stringify(formData),
    })
    if (res.success) {
      setShowAddForm(false)
      loadData()
    } else {
      alert(res.error || '创建失败')
    }
  }

  const handleOrderAction = async (orderId: number, status: string) => {
    const res = await apiFetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
    if (res.success) loadData()
  }

  const changeDate = (days: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const filteredOrders = orderFilter
    ? orders.filter(o => o.status === orderFilter)
    : orders

  const loadChatUsers = async () => {
    const res = await apiFetch('/api/chat/admin/chats')
    if (res.success && res.data) setChatUsers(res.data)
  }

  const loadChatMessages = async (userId: number) => {
    setSelectedChatUser(userId)
    const res = await apiFetch(`/api/chat/admin/chats/${userId}`)
    if (res.success && res.data) setChatMessages(res.data)
  }

  const handleAdminReply = async () => {
    if (!chatReply.trim() || !selectedChatUser) return
    const res = await apiFetch('/api/chat/admin/reply', {
      method: 'POST',
      body: JSON.stringify({ user_id: selectedChatUser, content: chatReply.trim() }),
    })
    if (res.success) {
      setChatReply('')
      loadChatMessages(selectedChatUser)
    }
  }

  useEffect(() => {
    if (activeTab === 'chats') loadChatUsers()
  }, [activeTab])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleUploadPhoto = async () => {
    if (!showPhotoUpload || !photoUrl.trim()) return
    const res = await apiFetch('/api/admin/photos', {
      method: 'POST',
      body: JSON.stringify({ order_id: showPhotoUpload, url: photoUrl.trim() }),
    })
    if (res.success) {
      setShowPhotoUpload(null)
      setPhotoUrl('')
      alert('照片已关联到订单！')
    } else {
      alert(res.error || '上传失败')
    }
  }

  return (
    <div className="min-h-screen bg-cloud pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif-sc text-2xl font-bold text-deep">排班管理</h1>
          <button onClick={() => setShowAddForm(true)} className="px-4 py-2 rounded-xl gradient-sky text-white text-sm font-medium shadow-lg shadow-sky-200 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform">
            <Plus className="w-4 h-4" /> 新增排班
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('schedule')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'schedule' ? 'gradient-sky text-white shadow-lg shadow-sky-200' : 'bg-white text-rock'}`}>
            <Calendar className="w-4 h-4 inline mr-1" /> 排班日历
          </button>
          <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'orders' ? 'gradient-sky text-white shadow-lg shadow-sky-200' : 'bg-white text-rock'}`}>
            订单管理
          </button>
          <button onClick={() => setActiveTab('chats')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'chats' ? 'gradient-sky text-white shadow-lg shadow-sky-200' : 'bg-white text-rock'}`}>
            <MessageCircle className="w-4 h-4 inline mr-1" /> 客服消息
          </button>
        </div>

        {activeTab === 'schedule' && (
          <>
            <div className="bg-white rounded-3xl p-6 shadow-sm mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-gray-100 transition"><ChevronLeft className="w-5 h-5 text-rock" /></button>
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-sky-start outline-none" />
                  <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-gray-100 transition"><ChevronRight className="w-5 h-5 text-rock" /></button>
                </div>
                <select value={selectedRoute || ''} onChange={(e) => setSelectedRoute(e.target.value ? Number(e.target.value) : null)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:border-sky-start outline-none">
                  <option value="">全部航线</option>
                  {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div className="flex items-center gap-2 text-sm">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" />适飞</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" />停飞</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-rock font-medium">航线</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">日期</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">时段</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">座位</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">适飞状态</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">天气备注</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="px-4 py-3 font-medium text-deep">{s.route_name}</td>
                        <td className="px-4 py-3 text-rock">{s.flight_date}</td>
                        <td className="px-4 py-3 text-rock">{s.time_slot}</td>
                        <td className="px-4 py-3">
                          <span className="text-deep">{s.available_seats}</span>/<span className="text-rock">{s.total_seats}</span>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleFlyable(s.id, !!s.is_flyable)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${s.is_flyable ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                            {s.is_flyable ? <><CheckCircle className="w-3 h-3" />适飞</> : <><XCircle className="w-3 h-3" />停飞</>}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-rock text-xs">{s.weather_remark || '-'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteSchedule(s.id)} className="text-red-500 hover:text-red-700 text-xs">删除</button>
                        </td>
                      </tr>
                    ))}
                    {schedules.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-rock">暂无排班数据</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <>
            <div className="bg-white rounded-3xl p-4 shadow-sm mb-6">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {[
                  { key: '', label: '全部' },
                  { key: 'pending', label: '待支付' },
                  { key: 'paid', label: '已预约' },
                  { key: 'completed', label: '已完成' },
                  { key: 'refunded', label: '已退款' },
                ].map((f) => (
                  <button key={f.key} onClick={() => setOrderFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${orderFilter === f.key ? 'gradient-sky text-white' : 'bg-gray-100 text-rock hover:bg-gray-200'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-rock font-medium">订单号</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">航线</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">游客</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">日期/时段</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">金额</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">状态</th>
                      <th className="px-4 py-3 text-left text-rock font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 20).map((o) => (
                      <tr key={o.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-mono text-xs text-rock">{o.order_no}</td>
                        <td className="px-4 py-3 text-deep">{o.route_name}</td>
                        <td className="px-4 py-3">
                          <p className="text-deep">{o.passenger_name || o.user_name}</p>
                          <p className="text-xs text-rock">{o.user_phone}</p>
                        </td>
                        <td className="px-4 py-3 text-rock">{o.flight_date}<br /><span className="text-xs">{o.time_slot}</span></td>
                        <td className="px-4 py-3 text-gold font-medium">¥{o.final_price}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            o.status === 'paid' ? 'bg-sky-100 text-sky-700' :
                            o.status === 'completed' ? 'bg-green-100 text-green-700' :
                            o.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            o.status === 'refunded' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {o.status === 'paid' ? '已预约' : o.status === 'completed' ? '已完成' : o.status === 'pending' ? '待支付' : o.status === 'refunded' ? '已退款' : o.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {o.status === 'paid' && (
                            <div className="flex gap-1">
                              <button onClick={() => handleOrderAction(o.id, 'completed')} className="text-green-600 hover:text-green-700 text-xs">完成</button>
                              <button onClick={() => handleOrderAction(o.id, 'refunded')} className="text-red-500 hover:text-red-600 text-xs ml-2">退款</button>
                            </div>
                          )}
                          {o.status === 'pending' && (
                            <button onClick={() => handleOrderAction(o.id, 'cancelled')} className="text-red-500 text-xs">取消</button>
                          )}
                          {(o.status === 'paid' || o.status === 'completed') && (
                            <button onClick={() => { setShowPhotoUpload(o.id); setPhotoUrl('') }} className="text-sky-600 hover:text-sky-700 text-xs ml-2">上传照片</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'chats' && (
          <div className="flex gap-6" style={{ minHeight: '500px' }}>
            <div className="w-64 bg-white rounded-3xl shadow-sm overflow-hidden flex-shrink-0">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-deep text-sm">咨询用户</h3>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '500px' }}>
                {chatUsers.length === 0 ? (
                  <p className="text-center text-rock text-sm py-8">暂无咨询</p>
                ) : chatUsers.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => loadChatMessages(u.id)}
                    className={`w-full text-left p-4 border-b border-gray-50 hover:bg-sky-50/50 transition ${selectedChatUser === u.id ? 'bg-sky-50' : ''}`}
                  >
                    <p className="font-medium text-deep text-sm">{u.name || u.phone}</p>
                    <p className="text-xs text-rock mt-0.5">{u.phone}</p>
                    <p className="text-xs text-rock/60 mt-1">{u.msg_count}条消息 · {u.last_msg_time?.slice(5, 16)}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 bg-white rounded-3xl shadow-sm overflow-hidden flex flex-col">
              {selectedChatUser ? (
                <>
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-deep">与 {chatMessages[0]?.user_name || chatMessages[0]?.user_phone || '游客'} 的对话</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '380px' }}>
                    {chatMessages.map((msg: any) => (
                      <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                          msg.sender === 'user'
                            ? 'bg-gray-100 text-deep rounded-bl-md'
                            : msg.sender === 'admin'
                            ? 'gradient-sky text-white rounded-br-md'
                            : 'bg-amber-50 text-amber-700 rounded-br-md'
                        }`}>
                          <p>{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.sender === 'admin' ? 'text-white/70' : 'text-rock/50'}`}>
                            {msg.sender === 'admin' ? '管理员' : msg.sender === 'bot' ? '自动回复' : '游客'} · {msg.created_at?.slice(11, 16)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatReply}
                        onChange={(e) => setChatReply(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAdminReply()}
                        placeholder="输入回复内容..."
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-sky-start focus:ring-2 focus:ring-sky-100 outline-none transition text-sm"
                      />
                      <button
                        onClick={handleAdminReply}
                        disabled={!chatReply.trim()}
                        className="px-4 py-2.5 rounded-xl gradient-sky text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-rock">选择左侧用户查看对话</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showPhotoUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowPhotoUpload(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif-sc text-lg font-bold text-deep mb-4">上传飞行照片</h3>
            <p className="text-sm text-rock mb-4">为订单 #{showPhotoUpload} 关联照片</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-rock mb-1">照片URL</label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="输入照片链接地址"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-sky-start"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPhotoUpload(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-rock font-medium hover:bg-gray-50 transition">取消</button>
              <button onClick={handleUploadPhoto} disabled={!photoUrl.trim()} className="flex-1 py-3 rounded-xl gradient-sky text-white font-medium shadow-lg shadow-sky-200 transition hover:scale-[1.02] disabled:opacity-50">确认上传</button>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif-sc text-lg font-bold text-deep mb-4">新增排班</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-rock mb-1">航线</label>
                <select value={formData.route_id} onChange={(e) => setFormData({ ...formData, route_id: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-sky-start">
                  {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-rock mb-1">日期</label>
                <input type="date" value={formData.flight_date} onChange={(e) => setFormData({ ...formData, flight_date: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-sky-start" />
              </div>
              <div>
                <label className="block text-sm text-rock mb-1">时段</label>
                <select value={formData.time_slot} onChange={(e) => setFormData({ ...formData, time_slot: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-sky-start">
                  {['08:00-08:30', '09:00-09:30', '10:00-10:30', '11:00-11:30', '14:00-14:30', '15:00-15:30', '16:00-16:30'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-rock mb-1">座位数</label>
                <input type="number" value={formData.total_seats} onChange={(e) => setFormData({ ...formData, total_seats: Number(e.target.value) })} min={1} max={10} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-sky-start" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_flyable} onChange={(e) => setFormData({ ...formData, is_flyable: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm text-deep">适飞</span>
                </label>
              </div>
              <div>
                <label className="block text-sm text-rock mb-1">天气备注</label>
                <input type="text" value={formData.weather_remark} onChange={(e) => setFormData({ ...formData, weather_remark: e.target.value })} placeholder="如：天气晴好" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-sky-start" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddForm(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-rock font-medium hover:bg-gray-50 transition">取消</button>
              <button onClick={handleAddSchedule} className="flex-1 py-3 rounded-xl gradient-sky text-white font-medium shadow-lg shadow-sky-200 transition hover:scale-[1.02]">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
