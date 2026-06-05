import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Mountain, Ruler, Check, Calendar, Users, Star, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, useAppStore } from '@/store/useAppStore'

interface Package {
  id: number
  name: string
  description: string
  price: number
  includes: string
}

interface Schedule {
  id: number
  flight_date: string
  time_slot: string
  total_seats: number
  available_seats: number
  is_flyable: number
  weather_remark: string
}

interface Seat {
  label: string
  available: boolean
}

interface RouteDetail {
  id: number
  name: string
  description: string
  cover_image: string
  type: string
  duration: number
  altitude: number
  distance: number
  departure_point: string
  departure_coords: string
  max_passengers: number
  packages: Package[]
  reviews: any[]
}

export default function RouteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, booking, setBooking } = useAppStore()
  const [route, setRoute] = useState<RouteDetail | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [seats, setSeats] = useState<Seat[]>([])
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedSchedule, setSelectedSchedule] = useState<number | null>(null)
  const [selectedSeat, setSelectedSeat] = useState<string>('')
  const [calendarMonth, setCalendarMonth] = useState(new Date())

  useEffect(() => {
    apiFetch(`/api/routes/${id}`).then((res) => {
      if (res.success && res.data) {
        setRoute(res.data)
        if (res.data.packages?.length) setSelectedPackage(res.data.packages[0].id)
      }
    })
  }, [id])

  useEffect(() => {
    if (id) {
      apiFetch(`/api/routes/${id}/schedule`).then((res) => {
        if (res.success && res.data) setSchedules(res.data)
      })
    }
  }, [id])

  useEffect(() => {
    if (selectedSchedule) {
      apiFetch(`/api/routes/${id}/seats?schedule_id=${selectedSchedule}`).then((res) => {
        if (res.success && res.data) setSeats(res.data.seats)
      })
    }
  }, [selectedSchedule])

  const handleBooking = () => {
    if (!user) { navigate('/login'); return }
    if (!selectedPackage || !selectedSchedule || !selectedSeat) {
      alert('请选择套餐、日期时段和座位')
      return
    }
    const schedule = schedules.find(s => s.id === selectedSchedule)
    if (!schedule || schedule.available_seats <= 0) {
      alert('该班次已满，请选择其他时段')
      return
    }
    setBooking({
      routeId: Number(id),
      packageId: selectedPackage,
      scheduleId: selectedSchedule,
      seatNo: selectedSeat,
      flightDate: schedule?.flight_date || '',
      timeSlot: schedule?.time_slot || '',
    })
    navigate('/booking')
  }

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const renderCalendar = () => {
    const days = getDaysInMonth(calendarMonth)
    const firstDay = getFirstDayOfMonth(calendarMonth)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cells = []

    for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} />)

    for (let d = 1; d <= days; d++) {
      const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const daySchedules = schedules.filter(s => s.flight_date === dateStr)
      const hasFlyable = daySchedules.some(s => s.is_flyable)
      const isPast = new Date(dateStr) < today
      const isSelected = selectedDate === dateStr

      cells.push(
        <button
          key={d}
          disabled={isPast || !hasFlyable}
          onClick={() => {
            setSelectedDate(dateStr)
            setSelectedSchedule(null)
            setSelectedSeat('')
            setSeats([])
          }}
          className={`relative w-full aspect-square rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center
            ${isSelected ? 'gradient-sky text-white shadow-lg shadow-sky-200' : ''}
            ${!isSelected && hasFlyable && !isPast ? 'text-deep hover:bg-sky-50' : ''}
            ${isPast || !hasFlyable ? 'text-gray-300 cursor-not-allowed' : ''}
          `}
        >
          {d}
          {hasFlyable && !isPast && (
            <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-sky-start'}`} />
          )}
        </button>
      )
    }
    return cells
  }

  const dateSchedules = selectedDate ? schedules.filter(s => s.flight_date === selectedDate && s.is_flyable) : []

  if (!route) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-sky-start border-t-transparent rounded-full" /></div>

  return (
    <div className="min-h-screen bg-cloud">
      <div className="relative h-80 overflow-hidden">
        <img src={route.cover_image} alt={route.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <button onClick={() => navigate('/')} className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="absolute bottom-6 left-6 z-10">
          <h1 className="font-serif-sc text-3xl font-bold text-white mb-2">{route.name}</h1>
          <div className="flex items-center gap-4 text-white/80 text-sm">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{route.duration}分钟</span>
            <span className="flex items-center gap-1"><Mountain className="w-4 h-4" />{route.altitude}m</span>
            <span className="flex items-center gap-1"><Ruler className="w-4 h-4" />{route.distance}km</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="font-serif-sc text-xl font-bold text-deep mb-3">航线介绍</h2>
          <p className="text-rock leading-relaxed">{route.description}</p>
          <div className="mt-4 flex items-center gap-2 text-sm text-rock">
            <Users className="w-4 h-4" />
            集合地点：{route.departure_point}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="font-serif-sc text-xl font-bold text-deep mb-4">票价套餐</h2>
          <div className="grid gap-3">
            {route.packages?.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`relative w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  selectedPackage === pkg.id ? 'border-gold bg-amber-50/50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {selectedPackage === pkg.id && (
                  <div className="absolute top-3 right-3 w-6 h-6 rounded-full gradient-gold flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-deep">{pkg.name}</p>
                    <p className="text-xs text-rock mt-1">{pkg.includes}</p>
                  </div>
                  <p className="text-xl font-bold text-gold">¥{pkg.price}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm">
          <h2 className="font-serif-sc text-xl font-bold text-deep mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-start" /> 选择日期
          </h2>
          <div className="mb-4 flex items-center justify-between">
            <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} className="p-2 rounded-lg hover:bg-gray-100 transition text-rock">
              ←
            </button>
            <span className="font-semibold text-deep">{calendarMonth.getFullYear()}年{calendarMonth.getMonth() + 1}月</span>
            <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} className="p-2 rounded-lg hover:bg-gray-100 transition text-rock">
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-rock mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="py-1 font-medium">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>
        </div>

        {selectedDate && dateSchedules.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm animate-fade-in-up">
            <h2 className="font-serif-sc text-xl font-bold text-deep mb-4">选择时段</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {dateSchedules.map((s) => {
                const isFull = s.available_seats <= 0
                return (
                  <button
                    key={s.id}
                    disabled={isFull}
                    onClick={() => { setSelectedSchedule(s.id); setSelectedSeat('') }}
                    className={`p-3 rounded-2xl border-2 text-center transition-all ${
                      selectedSchedule === s.id ? 'border-sky-start bg-sky-50' :
                      isFull ? 'border-gray-100 bg-gray-50 cursor-not-allowed' :
                      'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <p className={`font-medium text-sm ${isFull ? 'text-gray-400' : 'text-deep'}`}>{s.time_slot}</p>
                    <p className={`text-xs mt-1 ${isFull ? 'text-red-400 font-semibold' : 'text-rock'}`}>
                      {isFull ? '已满' : `余${s.available_seats}座`}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {selectedSchedule && (() => {
          const sched = schedules.find(s => s.id === selectedSchedule)
          if (!sched || sched.available_seats <= 0) return null
          return seats.length > 0 ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm animate-fade-in-up">
            <h2 className="font-serif-sc text-xl font-bold text-deep mb-4">选择座位</h2>
            <div className="flex justify-center">
              <div className="inline-block">
                <div className="w-32 h-8 gradient-sky rounded-t-3xl mb-2 mx-auto flex items-center justify-center">
                  <span className="text-white text-xs">驾驶舱</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {seats.map((seat) => (
                    <button
                      key={seat.label}
                      disabled={!seat.available}
                      onClick={() => setSelectedSeat(seat.label)}
                      className={`w-16 h-16 rounded-xl text-sm font-medium transition-all flex flex-col items-center justify-center
                        ${selectedSeat === seat.label ? 'gradient-gold text-white shadow-lg' : ''}
                        ${seat.available && selectedSeat !== seat.label ? 'bg-sky-50 text-sky-start border-2 border-sky-100 hover:border-sky-start' : ''}
                        ${!seat.available ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                      `}
                    >
                      <span>{seat.label}</span>
                      {seat.available ? <span className="text-xs">可选</span> : <span className="text-xs">已占</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          ) : null
        })()}

        {route.reviews?.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h2 className="font-serif-sc text-xl font-bold text-deep mb-4">游客评价</h2>
            <div className="space-y-4">
              {route.reviews.map((review: any, i: number) => (
                <div key={i} className="pb-4 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-deep text-sm">{review.user_name}</span>
                    <div className="flex">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star key={j} className="w-3.5 h-3.5 text-gold fill-gold" />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-rock">{review.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sticky bottom-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 p-4 -mx-4 sm:-mx-6 rounded-t-3xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              {selectedPackage && (() => {
                const pkg = route.packages?.find(p => p.id === selectedPackage)
                return pkg ? (
                  <div>
                    <p className="text-sm text-rock">{pkg.name}</p>
                    <p className="text-2xl font-bold text-gold">¥{pkg.price}<span className="text-sm text-rock font-normal">/人</span></p>
                  </div>
                ) : null
              })()}
            </div>
            <button
              onClick={handleBooking}
              disabled={!selectedPackage || !selectedSchedule || !selectedSeat || (() => { const s = schedules.find(sc => sc.id === selectedSchedule); return !s || s.available_seats <= 0 })()}
              className="px-8 py-3 rounded-2xl gradient-sky text-white font-semibold shadow-lg shadow-sky-200 hover:shadow-sky-300 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              立即预约 <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
