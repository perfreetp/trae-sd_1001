import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const isFlyable = Math.random() > 0.2
    const data = {
      temperature: 22 + Math.floor(Math.random() * 8),
      windSpeed: isFlyable ? (2 + Math.floor(Math.random() * 3)) : (6 + Math.floor(Math.random() * 4)),
      visibility: isFlyable ? (8 + Math.floor(Math.random() * 7)) : (1 + Math.floor(Math.random() * 2)),
      humidity: 45 + Math.floor(Math.random() * 30),
      condition: isFlyable ? '晴' : '大风',
      isFlyable,
      remark: isFlyable ? '天气晴好，适宜飞行' : '风力偏大，暂不适合飞行'
    }
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取天气失败' })
  }
})

router.get('/fly-status', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const today = new Date().toISOString().split('T')[0]
    const statuses = db.prepare(`
      SELECT s.route_id, r.name as route_name, s.is_flyable, s.weather_remark
      FROM schedules s
      JOIN routes r ON s.route_id = r.id
      WHERE s.flight_date = ?
      GROUP BY s.route_id
    `).all(today)
    res.json({ success: true, data: statuses })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取适飞状态失败' })
  }
})

export default router
