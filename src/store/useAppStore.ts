import { create } from 'zustand'

interface User {
  id: number
  phone: string
  name: string
  id_card: string
  role: string
}

interface BookingState {
  routeId: number | null
  packageId: number | null
  scheduleId: number | null
  seatNo: string
  flightDate: string
  timeSlot: string
  couponId: number | null
}

interface AppState {
  user: User | null
  token: string | null
  booking: BookingState
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setBooking: (booking: Partial<BookingState>) => void
  resetBooking: () => void
  logout: () => void
}

const emptyBooking: BookingState = {
  routeId: null,
  packageId: null,
  scheduleId: null,
  seatNo: '',
  flightDate: '',
  timeSlot: '',
  couponId: null,
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem('skyview_token'),
  booking: { ...emptyBooking },
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('skyview_token', token)
    else localStorage.removeItem('skyview_token')
    set({ token })
  },
  setBooking: (booking) => set((state) => ({ booking: { ...state.booking, ...booking } })),
  resetBooking: () => set({ booking: { ...emptyBooking } }),
  logout: () => {
    localStorage.removeItem('skyview_token')
    set({ user: null, token: null })
  },
}))

export async function apiFetch<T = any>(url: string, options?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  const token = localStorage.getItem('skyview_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })
  return res.json()
}
