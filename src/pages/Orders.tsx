import { useNavigate } from 'react-router-dom'
import { QrCode, Navigation, Calendar, Clock, RefreshCw, XCircle, ChevronRight, MapPin, Plane } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, useAppStore } from '@/store/useAppStore'

interface Order {
  id: number
  order_no: string
  route_name: string
  route_type: string
  cover_image: string
  package_name: string
  flight_date: string
  time_slot: string
  seat_no: string
  passenger_name: string
  final_price: number
  original_price: number
  discount_amount: number
  status: string
  created_at: string
  departure_point?: string
  departure_coords?: string
  reviewed?: boolean
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: '待支付', color: 'bg-amber-100 text-amber-700' },
  paid: { label: '已预约', color: 'bg-sky-100 text-sky-700' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
  refunded: { label: '已退款', color: 'bg-red-100 text-red-600' },
}

export default function Orders() {
  const navigate = useNavigate()
  const { user, token } = useAppStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState('all')
  const [showVoucher, setShowVoucher] = useState<Order | null>(null)
  const [showReschedule, setShowReschedule] = useState<Order | null>(null)
  const [showRefund, setShowRefund] = useState<Order | null>(null)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    if (!user) return
    loadOrders()
  }, [filter, user])

  const loadOrders = async () => {
    const status = filter === 'all' ? '' : `?status=${filter}`
    const res = await apiFetch(`/api/orders${status}`)
    if (res.success && res.data) {
      const ordersWithReview = await Promise.all(
        res.data.map(async (o: Order) => {
          try {
            const revRes = await apiFetch(`/api/reviews/order/${o.id}`)
            return { ...o, reviewed: !!(revRes.success && revRes.data) }
          } catch {
            return { ...o, reviewed: false }
          }
        })
      )
      setOrders(ordersWithReview)
    }
  }

  const handleReschedule = async (orderId: number, scheduleId: number, seatNo: string) => {
    const res = await apiFetch(`/api/orders/${orderId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({ schedule_id: scheduleId, seat_no: seatNo }),
    })
    if (res.success) {
      alert('改签成功！')
      setShowReschedule(null)
      loadOrders()
    } else {
      alert(res.error || '改签失败')
    }
  }

  const handleRefund = async (orderId: number) => {
    const res = await apiFetch(`/api/orders/${orderId}/refund`, { method: 'POST' })
    if (res.success) {
      alert(`退票成功！退款金额：¥${res.data.refundAmount}`)
      setShowRefund(null)
      loadOrders()
    } else {
      alert(res.error || '退票失败')
    }
  }

  const filters = [
    { key: 'all', label: '全部' },
    { key: 'paid', label: '已预约' },
    { key: 'completed', label: '已完成' },
    { key: 'pending', label: '待支付' },
  ]

  return (
    <div className="min-h-screen bg-cloud pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-serif-sc text-2xl font-bold text-deep mb-6">我的订单</h1>

        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === f.key ? 'gradient-sky text-white shadow-lg shadow-sky-200' : 'bg-white text-rock hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center">
            <Plane className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-rock mb-4">暂无订单</p>
            <button onClick={() => navigate('/')} className="px-6 py-2 rounded-xl gradient-sky text-white text-sm font-medium shadow-lg shadow-sky-200">
              去预约
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusLabels[order.status] || statusLabels.pending
              return (
                <div key={order.id} className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex">
                    <div className={`w-1.5 ${order.status === 'paid' ? 'gradient-sky' : order.status === 'completed' ? 'bg-green-500' : order.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400'}`} />
                    <div className="flex-1 p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-deep">{order.route_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-rock mb-4">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{order.flight_date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{order.time_slot}</span>
                        <span>座位：{order.seat_no}</span>
                        <span className="font-semibold text-gold">¥{order.final_price}</span>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {order.status === 'paid' && (
                          <>
                            <button onClick={() => setShowVoucher(order)} className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-start text-xs font-medium hover:bg-sky-100 transition flex items-center gap-1">
                              <QrCode className="w-3.5 h-3.5" /> 电子凭证
                            </button>
                            <button onClick={() => setShowReschedule(order)} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium hover:bg-amber-100 transition flex items-center gap-1">
                              <RefreshCw className="w-3.5 h-3.5" /> 改签
                            </button>
                            <button onClick={() => setShowRefund(order)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" /> 退票
                            </button>
                          </>
                        )}
                        {order.status === 'paid' && !order.reviewed && (
                          <button onClick={() => navigate(`/review/${order.id}`)} className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-xs font-medium hover:bg-green-100 transition">
                            评价
                          </button>
                        )}
                        {order.status === 'completed' && !order.reviewed && (
                          <button onClick={() => navigate(`/review/${order.id}`)} className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 text-xs font-medium hover:bg-green-100 transition">
                            评价/领取照片
                          </button>
                        )}
                        {order.reviewed && (
                          <span className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-400 text-xs font-medium">
                            已评价
                          </span>
                        )}
                        {(order.status === 'paid' || order.status === 'completed') && (
                          <button
                            onClick={() => {
                              const point = order.departure_point || '景区集合点'
                              window.open(`https://uri.amap.com/search?keyword=${encodeURIComponent(point)}`, '_blank')
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium hover:bg-indigo-100 transition flex items-center gap-1"
                          >
                            <Navigation className="w-3.5 h-3.5" /> 集合点导航
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowVoucher(null)}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="border-2 border-dashed border-sky-200 rounded-2xl p-6">
              <div className="w-32 h-32 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                <QrCode className="w-20 h-20 text-sky-start" />
              </div>
              <h3 className="font-serif-sc text-lg font-bold text-deep mb-1">{showVoucher.route_name}</h3>
              <p className="text-sm text-rock">{showVoucher.package_name}</p>
              <div className="mt-3 space-y-1 text-sm">
                <p><Calendar className="w-4 h-4 inline mr-1" />{showVoucher.flight_date}</p>
                <p><Clock className="w-4 h-4 inline mr-1" />{showVoucher.time_slot}</p>
                <p>座位号：{showVoucher.seat_no}</p>
              </div>
              <p className="mt-3 text-lg font-bold text-gold">¥{showVoucher.final_price}</p>
            </div>
            <p className="text-xs text-rock mt-4">请出示此凭证进行核销</p>
          </div>
        </div>
      )}

      {showRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowRefund(null)}>
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif-sc text-lg font-bold text-deep mb-4">确认退票</h3>
            <div className="bg-red-50 rounded-xl p-4 mb-4 text-sm text-red-700">
              <p className="font-medium mb-2">退票规则：</p>
              <p>起飞前48小时：全额退款</p>
              <p>24-48小时：扣30%手续费</p>
              <p>24小时内：扣50%手续费</p>
            </div>
            <p className="text-sm text-rock mb-6">退款金额：<span className="text-xl font-bold text-gold">¥{showRefund.final_price}</span></p>
            <div className="flex gap-3">
              <button onClick={() => setShowRefund(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-rock font-medium hover:bg-gray-50 transition">取消</button>
              <button onClick={() => handleRefund(showRefund.id)} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition">确认退票</button>
            </div>
          </div>
        </div>
      )}

      {showReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowReschedule(null)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif-sc text-lg font-bold text-deep mb-4">改签航班</h3>
            <p className="text-sm text-rock mb-4">当前：{showReschedule.flight_date} {showReschedule.time_slot}</p>
            <RescheduleForm orderId={showReschedule.id} routeId={showReschedule.route_type ? undefined : undefined} onConfirm={(scheduleId, seatNo) => handleReschedule(showReschedule.id, scheduleId, seatNo)} onCancel={() => setShowReschedule(null)} />
          </div>
        </div>
      )}
    </div>
  )
}

function RescheduleForm({ orderId, onConfirm, onCancel }: { orderId: number; routeId?: number; onConfirm: (scheduleId: number, seatNo: string) => void; onCancel: () => void }) {
  const [schedules, setSchedules] = useState<any[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<number | null>(null)
  const [seatNo, setSeatNo] = useState('A1')

  useEffect(() => {
    apiFetch('/api/routes').then((res) => {
      if (res.success && res.data?.length) {
        apiFetch(`/api/routes/${res.data[0].id}/schedule`).then((sRes) => {
          if (sRes.success && sRes.data) setSchedules(sRes.data.filter((s: any) => s.is_flyable && s.available_seats > 0))
        })
      }
    })
  }, [])

  return (
    <div className="space-y-4">
      <div className="max-h-48 overflow-y-auto space-y-2">
        {schedules.slice(0, 10).map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSchedule(s.id)}
            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedSchedule === s.id ? 'border-sky-start bg-sky-50' : 'border-gray-100'}`}
          >
            <span className="text-sm font-medium text-deep">{s.flight_date} {s.time_slot}</span>
            <span className="text-xs text-rock ml-2">余{s.available_seats}座</span>
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-200 text-rock font-medium hover:bg-gray-50 transition">取消</button>
        <button onClick={() => selectedSchedule && onConfirm(selectedSchedule, seatNo)} disabled={!selectedSchedule} className="flex-1 py-3 rounded-xl gradient-sky text-white font-medium shadow-lg shadow-sky-200 transition-all disabled:opacity-50">确认改签</button>
      </div>
    </div>
  )
}
