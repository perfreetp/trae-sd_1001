import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Ticket, CreditCard, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, useAppStore } from '@/store/useAppStore'

interface UserCoupon {
  id: number
  coupon_id: number
  name: string
  type: string
  value: number
  min_amount: number
  is_used: number
}

interface Package {
  id: number
  name: string
  price: number
}

export default function Booking() {
  const navigate = useNavigate()
  const { user, token, booking, setBooking, resetBooking } = useAppStore()
  const [name, setName] = useState('')
  const [idCard, setIdCard] = useState('')
  const [phone, setPhone] = useState('')
  const [weight, setWeight] = useState('')
  const [safetyConfirmed, setSafetyConfirmed] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<number | null>(null)
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([])
  const [pkg, setPkg] = useState<Package | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSafety, setShowSafety] = useState(false)
  const [safetyScrolled, setSafetyScrolled] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [orderNo, setOrderNo] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = '请输入姓名'
    else if (name.trim().length < 2) e.name = '姓名至少2个字符'
    if (!idCard.trim()) e.idCard = '请输入身份证号'
    else if (!/^\d{17}[\dXx]$/.test(idCard.trim())) e.idCard = '身份证号格式不正确'
    if (!phone.trim()) e.phone = '请输入手机号'
    else if (!/^1[3-9]\d{9}$/.test(phone.trim())) e.phone = '手机号格式不正确'
    if (!booking.seatNo) e.seat = '未选择座位'
    if (!booking.scheduleId) e.schedule = '未选择班次'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    if (!user) return
    if (!booking.routeId || !booking.packageId || !booking.scheduleId) { navigate('/'); return }

    apiFetch(`/api/routes/${booking.routeId}`).then((res) => {
      if (res.success && res.data?.packages) {
        const found = res.data.packages.find((p: Package) => p.id === booking.packageId)
        setPkg(found || null)
      }
    })
    apiFetch('/api/coupons/user').then((res) => {
      if (res.success && res.data) setUserCoupons(res.data.filter((c: UserCoupon) => !c.is_used))
    })

    if (user.name) setName(user.name)
    if (user.id_card) setIdCard(user.id_card)
    if (user.phone) setPhone(user.phone)
  }, [user])

  const originalPrice = pkg?.price || 0
  let discountAmount = 0
  if (selectedCoupon) {
    const coupon = userCoupons.find(c => c.coupon_id === selectedCoupon)
    if (coupon) {
      discountAmount = coupon.type === 'fixed' ? coupon.value : originalPrice * (coupon.value / 100)
    }
  }
  const finalPrice = Math.max(0, originalPrice - discountAmount)

  const handleSubmit = async () => {
    if (!validate()) return
    if (!safetyConfirmed) { alert('请确认安全须知'); return }
    if (!pkg) return

    setLoading(true)
    try {
      const res = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          route_id: booking.routeId,
          package_id: booking.packageId,
          schedule_id: booking.scheduleId,
          seat_no: booking.seatNo,
          passenger_name: name,
          passenger_id_card: idCard,
          passenger_phone: phone,
          passenger_weight: weight ? Number(weight) : null,
          coupon_id: selectedCoupon,
        }),
      })
      if (res.success && res.data) {
        setOrderNo(res.data.orderNo)
        const payRes = await apiFetch(`/api/orders/${res.data.orderId}/pay`, { method: 'POST' })
        if (payRes.success) {
          setPaymentSuccess(true)
        }
      } else {
        alert(res.error || '预约失败')
      }
    } catch {
      alert('网络错误')
    } finally {
      setLoading(false)
    }
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-cloud flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center animate-fade-in-up">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="font-serif-sc text-2xl font-bold text-deep mb-2">预约成功！</h2>
          <p className="text-rock mb-6">订单号：{orderNo}</p>
          <div className="bg-sky-50 rounded-2xl p-4 mb-6">
            <p className="text-sm text-rock">飞行日期</p>
            <p className="font-semibold text-deep">{booking.flightDate} {booking.timeSlot}</p>
            <p className="text-sm text-rock mt-2">座位号</p>
            <p className="font-semibold text-deep">{booking.seatNo}</p>
          </div>
          <div className="space-y-3">
            <button onClick={() => { resetBooking(); navigate('/orders') }} className="w-full py-3 rounded-xl gradient-sky text-white font-medium shadow-lg shadow-sky-200 transition-all hover:scale-[1.02] active:scale-[0.98]">
              查看我的订单
            </button>
            <button onClick={() => { resetBooking(); navigate('/') }} className="w-full py-3 rounded-xl border border-gray-200 text-rock font-medium hover:bg-gray-50 transition">
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cloud">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-rock hover:text-deep mb-6 transition">
          <ArrowLeft className="w-5 h-5" /> 返回
        </button>

        <h1 className="font-serif-sc text-2xl font-bold text-deep mb-8">确认预约</h1>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h3 className="font-semibold text-deep mb-4">游客实名信息</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-rock mb-1">姓名 <span className="text-red-400">*</span></label>
                <input type="text" value={name} onChange={(e) => { setName(e.target.value); if (errors.name) setErrors({...errors, name: ''}) }} placeholder="请输入真实姓名（需与证件一致）" className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-sky-start focus:ring-2 focus:ring-sky-100'} outline-none transition text-sm`} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm text-rock mb-1">身份证号 <span className="text-red-400">*</span></label>
                <input type="text" value={idCard} onChange={(e) => { setIdCard(e.target.value); if (errors.idCard) setErrors({...errors, idCard: ''}) }} placeholder="请输入身份证号码" className={`w-full px-4 py-3 rounded-xl border ${errors.idCard ? 'border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-sky-start focus:ring-2 focus:ring-sky-100'} outline-none transition text-sm`} />
                {errors.idCard && <p className="text-xs text-red-500 mt-1">{errors.idCard}</p>}
              </div>
              <div>
                <label className="block text-sm text-rock mb-1">联系电话 <span className="text-red-400">*</span></label>
                <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors({...errors, phone: ''}) }} placeholder="请输入手机号" className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-400 focus:ring-red-100' : 'border-gray-200 focus:border-sky-start focus:ring-2 focus:ring-sky-100'} outline-none transition text-sm`} />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm text-rock mb-1">体重（kg）</label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="用于飞行器配重平衡（选填）" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-start focus:ring-2 focus:ring-sky-100 outline-none transition text-sm" />
              </div>
            </div>
          </div>

          {userCoupons.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <h3 className="font-semibold text-deep mb-4 flex items-center gap-2"><Ticket className="w-5 h-5 text-gold" /> 优惠券</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCoupon(null)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${!selectedCoupon ? 'border-sky-start bg-sky-50' : 'border-gray-100'}`}
                >
                  <span className="text-sm text-deep">不使用优惠券</span>
                </button>
                {userCoupons.map((coupon) => (
                  <button
                    key={coupon.coupon_id}
                    onClick={() => setSelectedCoupon(coupon.coupon_id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${selectedCoupon === coupon.coupon_id ? 'border-gold bg-amber-50/50' : 'border-gray-100'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-deep">{coupon.name}</span>
                      <span className="text-gold font-bold">
                        {coupon.type === 'fixed' ? `-¥${coupon.value}` : `-${coupon.value}%`}
                      </span>
                    </div>
                    {coupon.min_amount > 0 && <p className="text-xs text-rock mt-1">满¥{coupon.min_amount}可用</p>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h3 className="font-semibold text-deep mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-sky-start" /> 安全须知</h3>
            <div className={`p-4 rounded-xl border-2 transition-all ${safetyConfirmed ? 'border-green-200 bg-green-50/50' : 'border-gray-100'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={safetyConfirmed}
                  onChange={(e) => {
                    if (e.target.checked) setShowSafety(true)
                    else setSafetyConfirmed(false)
                  }}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-sky-start focus:ring-sky-start"
                />
                <span className="text-sm text-deep">我已阅读并同意《低空游览安全须知》，了解飞行风险并自愿参加</span>
              </label>
              <button onClick={() => setShowSafety(true)} className="text-xs text-sky-start mt-2 hover:underline">
                查看安全须知全文 →
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h3 className="font-semibold text-deep mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-sky-start" /> 订单明细</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-rock">套餐价格</span>
                <span className="text-deep">¥{originalPrice}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-rock">优惠金额</span>
                  <span className="text-green-600">-¥{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between">
                <span className="font-semibold text-deep">应付金额</span>
                <span className="text-2xl font-bold text-gold">¥{finalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !safetyConfirmed || !name || !idCard || !phone}
            className="w-full py-4 rounded-2xl gradient-sky text-white font-semibold text-lg shadow-lg shadow-sky-200 hover:shadow-sky-300 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '处理中...' : `确认支付 ¥${finalPrice.toFixed(2)}`}
          </button>
        </div>
      </div>

      {showSafety && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50" onClick={() => { if (safetyScrolled) setShowSafety(false) }}>
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-serif-sc text-lg font-bold text-deep">低空游览安全须知</h3>
            </div>
            <div
              className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-rock"
              onScroll={(e) => {
                const el = e.target as HTMLElement
                if (el.scrollHeight - el.scrollTop - el.clientHeight < 50) {
                  setSafetyScrolled(true)
                }
              }}
            >
              <p><strong>一、飞行前准备</strong></p>
              <p>1. 请提前30分钟到达集合点，配合工作人员进行安全培训。</p>
              <p>2. 患有心脏病、高血压、癫痫等疾病的游客，请在购票前咨询医生意见。</p>
              <p>3. 孕妇、6岁以下儿童、65岁以上老人不建议乘坐。</p>
              <p>4. 饮酒后或服用影响判断力药物者禁止乘坐。</p>
              <p><strong>二、登机须知</strong></p>
              <p>1. 登机前请系好安全带，佩戴好安全头盔和护目镜。</p>
              <p>2. 严禁携带易燃易爆物品、尖锐物品登机。</p>
              <p>3. 拍照设备需配有挂绳，防止掉落。</p>
              <p>4. 服从飞行员指令，不得擅自触碰飞行器操作设备。</p>
              <p><strong>三、飞行中注意事项</strong></p>
              <p>1. 飞行过程中请保持坐姿，不得解开安全带。</p>
              <p>2. 如感不适，请立即告知飞行员。</p>
              <p>3. 飞行中禁止吸烟、饮食。</p>
              <p><strong>四、天气与安全</strong></p>
              <p>1. 如遇恶劣天气（大风、雷暴、低能见度），航班将取消并全额退款。</p>
              <p>2. 起飞前2小时会通过短信通知航班状态。</p>
              <p>3. 飞行全程有地面人员实时监控，确保安全。</p>
              <p><strong>五、责任声明</strong></p>
              <p>1. 游客应如实填写个人信息，因信息不实导致的问题由游客自行承担。</p>
              <p>2. 飞行全程已投保航空意外险，如发生意外按保险条款理赔。</p>
              <p>3. 游客应遵守以上安全规定，因违反规定导致的后果由游客自行承担。</p>
            </div>
            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  if (safetyScrolled) {
                    setSafetyConfirmed(true)
                    setShowSafety(false)
                  }
                }}
                disabled={!safetyScrolled}
                className="w-full py-3 rounded-xl gradient-sky text-white font-medium shadow-lg shadow-sky-200 transition-all disabled:opacity-50"
              >
                {safetyScrolled ? '我已阅读并同意' : '请滑动阅读至底部'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
