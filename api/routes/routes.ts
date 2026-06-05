import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const routes = db.prepare('SELECT * FROM routes WHERE is_active = 1').all()
    res.json({ success: true, data: routes })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取航线列表失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const route = db.prepare('SELECT * FROM routes WHERE id = ?').get(req.params.id) as any
    if (!route) {
      res.status(404).json({ success: false, error: '航线不存在' })
      return
    }
    const packages = db.prepare('SELECT * FROM packages WHERE route_id = ?').all(req.params.id)
    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.route_id = ? ORDER BY r.created_at DESC LIMIT 10
    `).all(req.params.id)
    res.json({ success: true, data: { ...route, packages, reviews } })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取航线详情失败' })
  }
})

router.get('/:id/schedule', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { date } = req.query
    let schedules
    if (date) {
      schedules = db.prepare('SELECT * FROM schedules WHERE route_id = ? AND flight_date = ? ORDER BY time_slot').all(req.params.id, date)
    } else {
      schedules = db.prepare('SELECT * FROM schedules WHERE route_id = ? ORDER BY flight_date, time_slot').all(req.params.id)
    }
    res.json({ success: true, data: schedules })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取排班失败' })
  }
})

router.get('/:id/seats', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { schedule_id } = req.query
    if (!schedule_id) {
      res.status(400).json({ success: false, error: '缺少schedule_id参数' })
      return
    }

    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ? AND route_id = ?').get(schedule_id, req.params.id) as any
    if (!schedule) {
      res.status(404).json({ success: false, error: '排班不存在' })
      return
    }

    const takenSeats = db.prepare('SELECT seat_no FROM orders WHERE schedule_id = ? AND status != ?').all(schedule_id, 'cancelled').map((o: any) => o.seat_no)

    const totalSeats = schedule.total_seats
    const seats = []
    for (let i = 1; i <= totalSeats; i++) {
      const seatLabel = String.fromCharCode(65 + Math.floor((i - 1) / 2)) + ((i - 1) % 2 + 1)
      seats.push({
        label: seatLabel,
        available: !takenSeats.includes(seatLabel) && takenSeats.length < totalSeats
      })
    }

    res.json({ success: true, data: { seats, totalSeats, availableSeats: totalSeats - takenSeats.length } })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取座位失败' })
  }
})

export default router
