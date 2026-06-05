import { useNavigate } from 'react-router-dom'
import { CloudSun, Wind, Eye, Thermometer, Ticket, ChevronRight, Mountain, Trees, Building, Star, Clock, ArrowRight, Plane } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, useAppStore } from '@/store/useAppStore'

interface Weather {
  temperature: number
  windSpeed: number
  visibility: number
  humidity: number
  condition: string
  isFlyable: boolean
  remark: string
}

interface Route {
  id: number
  name: string
  description: string
  cover_image: string
  type: string
  duration: number
  altitude: number
  distance: number
  departure_point: string
  max_passengers: number
}

interface Coupon {
  id: number
  name: string
  type: string
  value: number
  min_amount: number
  total_count: number
  claimed_count: number
}

const typeIcons: Record<string, any> = {
  canyon: Mountain,
  tea: Trees,
  village: Building,
}

export default function Home() {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const { user, setToken, setUser } = useAppStore()
  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      if (useAppStore.getState().token && !user) {
        const res = await apiFetch('/api/auth/me')
        if (res.success && res.data) setUser(res.data)
      }
    }
    init()

    apiFetch('/api/weather').then((res) => {
      if (res.success && res.data) setWeather(res.data)
    })
    apiFetch('/api/routes').then((res) => {
      if (res.success && res.data) setRoutes(res.data)
    })
    apiFetch('/api/coupons').then((res) => {
      if (res.success && res.data) setCoupons(res.data)
    })
  }, [])

  const [weatherLoading, setWeatherLoading] = useState(false)

  const refreshWeather = async () => {
    setWeatherLoading(true)
    const el = document.getElementById('weather')
    el?.scrollIntoView({ behavior: 'smooth' })
    try {
      const res = await apiFetch('/api/weather')
      if (res.success && res.data) setWeather(res.data)
    } finally {
      setTimeout(() => setWeatherLoading(false), 500)
    }
  }

  const handleClaimCoupon = async (couponId: number) => {
    if (!user) {
      navigate('/login')
      return
    }
    const res = await apiFetch(`/api/coupons/${couponId}/claim`, { method: 'POST' })
    if (res.success) {
      setCoupons((prev) => prev.filter((c) => c.id !== couponId))
      alert('领取成功！')
    } else {
      alert(res.error || '领取失败')
    }
  }

  return (
    <div className="min-h-screen bg-cloud">
      <div className="relative h-[520px] overflow-hidden">
        <div className="absolute inset-0 gradient-sky" />
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 1440 520" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0,320 C120,280 240,200 360,240 C480,280 540,160 660,200 C780,240 840,120 960,180 C1080,240 1200,160 1320,200 C1380,220 1440,180 1440,180 L1440,520 L0,520 Z" fill="white" opacity="0.3" />
            <path d="M0,380 C180,340 300,300 420,340 C540,380 660,260 780,300 C900,340 1020,240 1140,280 C1260,320 1380,260 1440,280 L1440,520 L0,520 Z" fill="white" opacity="0.2" />
            <path d="M0,440 C200,420 400,380 600,400 C800,420 1000,360 1200,380 C1300,390 1400,370 1440,380 L1440,520 L0,520 Z" fill="white" opacity="0.15" />
          </svg>
        </div>
        <div className="absolute top-24 left-[10%] w-20 h-8 bg-white/20 rounded-full blur-sm animate-cloud" />
        <div className="absolute top-36 left-[60%] w-28 h-10 bg-white/15 rounded-full blur-md animate-cloud-slow" />
        <div className="absolute top-28 left-[80%] w-16 h-6 bg-white/10 rounded-full blur-sm animate-cloud" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 h-full flex flex-col justify-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-white/90 text-sm mb-6">
              <CloudSun className="w-4 h-4" />
              <span>{weather?.isFlyable ? '今日适飞 ✈️' : '今日暂不适飞'}</span>
            </div>
            <h1 className="font-serif-sc text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
              云端漫步<br />
              <span className="text-gold">山水之间</span>
            </h1>
            <p className="text-white/80 text-lg max-w-lg mb-8">
              乘坐小型飞行器，俯瞰峡谷壮美、茶山云海与百年古村，开启一段难忘的低空之旅
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  const el = document.getElementById('routes')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="px-8 py-3.5 rounded-2xl gradient-gold text-white font-semibold shadow-lg shadow-amber-200/50 hover:shadow-amber-300/50 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                立即预约 <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={refreshWeather}
                disabled={weatherLoading}
                className="px-8 py-3.5 rounded-2xl bg-white/20 backdrop-blur-sm text-white font-medium hover:bg-white/30 transition-all flex items-center gap-2 disabled:opacity-70"
              >
                {weatherLoading ? '刷新中...' : '查看天气'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="weather" className="max-w-7xl mx-auto px-4 sm:px-6 -mt-12 relative z-20">
        <div className={`glass-card rounded-3xl p-6 shadow-xl transition-opacity ${weatherLoading ? 'opacity-70' : ''}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${weather?.isFlyable ? 'bg-green-500 animate-pulse-glow' : 'bg-red-500'}`} />
            <span className="font-semibold text-deep">{weather?.isFlyable ? '适飞条件良好' : '暂不适飞'}</span>
            <span className="text-sm text-rock">{weather?.remark}</span>
            {weatherLoading && <span className="text-xs text-sky-start ml-auto">刷新中...</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-rock">温度</p>
                <p className="font-semibold text-deep">{weather?.temperature}°C</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <Wind className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <p className="text-xs text-rock">风力</p>
                <p className="font-semibold text-deep">{weather?.windSpeed}级</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Eye className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-rock">能见度</p>
                <p className="font-semibold text-deep">{weather?.visibility}km</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <CloudSun className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <p className="text-xs text-rock">天气</p>
                <p className="font-semibold text-deep">{weather?.condition}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="routes" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-serif-sc text-2xl sm:text-3xl font-bold text-deep mb-2">热门航线</h2>
            <p className="text-rock">从空中感受不一样的风景</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {routes.map((route, index) => {
            const Icon = typeIcons[route.type] || Mountain
            return (
              <div
                key={route.id}
                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(`/route/${route.id}`)}
              >
                <div className="relative h-52 overflow-hidden">
                  <img src={route.cover_image} alt={route.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-deep">
                    <Icon className="w-3.5 h-3.5 text-sky-start" />
                    {route.type === 'canyon' ? '峡谷' : route.type === 'tea' ? '茶山' : '古村'}
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <h3 className="font-serif-sc text-xl font-bold text-white">{route.name}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-rock line-clamp-2 mb-4">{route.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-rock">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{route.duration}分钟</span>
                      <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-gold" />4.9</span>
                    </div>
                    <div className="text-sky-start font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                      了解详情 <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {coupons.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-serif-sc text-2xl sm:text-3xl font-bold text-deep mb-2">限时优惠券</h2>
              <p className="text-rock">先领券再预约，更划算</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex">
                <div className="w-2 gradient-gold flex-shrink-0" />
                <div className="flex-1 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-deep text-sm">{coupon.name}</p>
                    <p className="text-lg font-bold text-gold mt-1">
                      {coupon.type === 'fixed' ? `¥${coupon.value}` : `${coupon.value}%OFF`}
                    </p>
                    <p className="text-xs text-rock mt-0.5">
                      {coupon.min_amount > 0 ? `满¥${coupon.min_amount}可用` : '无门槛'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleClaimCoupon(coupon.id)}
                    className="px-4 py-2 rounded-xl gradient-sky text-white text-xs font-medium shadow hover:shadow-md transition-all active:scale-95"
                  >
                    领取
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="bg-deep text-white/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Plane className="w-5 h-5 text-sky-end" />
            <span className="font-serif-sc text-lg text-white/80">云览山海</span>
          </div>
          <p className="text-sm">低空游览预约平台 · 让每一次飞行都成为美好回忆</p>
        </div>
      </footer>
    </div>
  )
}
