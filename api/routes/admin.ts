import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getDb } from '../database.js'
import { authMiddleware, adminMiddleware } from './auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

const router = Router()

router.get('/schedule', authMiddleware, adminMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { route_id, date } = req.query

    let schedules
    if (route_id && date) {
      schedules = db.prepare(`
        SELECT s.*, r.name as route_name FROM schedules s
        JOIN routes r ON s.route_id = r.id
        WHERE s.route_id = ? AND s.flight_date = ?
        ORDER BY s.time_slot
      `).all(route_id, date)
    } else if (route_id) {
      schedules = db.prepare(`
        SELECT s.*, r.name as route_name FROM schedules s
        JOIN routes r ON s.route_id = r.id
        WHERE s.route_id = ?
        ORDER BY s.flight_date, s.time_slot
      `).all(route_id)
    } else if (date) {
      schedules = db.prepare(`
        SELECT s.*, r.name as route_name FROM schedules s
        JOIN routes r ON s.route_id = r.id
        WHERE s.flight_date = ?
        ORDER BY s.route_id, s.time_slot
      `).all(date)
    } else {
      schedules = db.prepare(`
        SELECT s.*, r.name as route_name FROM schedules s
        JOIN routes r ON s.route_id = r.id
        ORDER BY s.flight_date DESC, s.time_slot
        LIMIT 200
      `).all()
    }
    res.json({ success: true, data: schedules })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取排班失败' })
  }
})

router.post('/schedule', authMiddleware, adminMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { route_id, flight_date, time_slot, total_seats, is_flyable, weather_remark } = req.body

    const existing = db.prepare('SELECT id FROM schedules WHERE route_id = ? AND flight_date = ? AND time_slot = ?').get(route_id, flight_date, time_slot)
    if (existing) {
      res.status(400).json({ success: false, error: '该时段已存在排班' })
      return
    }

    db.prepare('INSERT INTO schedules (route_id, flight_date, time_slot, total_seats, available_seats, is_flyable, weather_remark) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(route_id, flight_date, time_slot, total_seats, total_seats, is_flyable ? 1 : 0, weather_remark || '')
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建排班失败' })
  }
})

router.put('/schedule/:id', authMiddleware, adminMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { is_flyable, weather_remark, total_seats } = req.body
    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id) as any
    if (!schedule) {
      res.status(404).json({ success: false, error: '排班不存在' })
      return
    }

    const bookedSeats = schedule.total_seats - schedule.available_seats
    if (total_seats !== undefined && total_seats < bookedSeats) {
      res.status(400).json({ success: false, error: `已有${bookedSeats}人预约，不能减少至${total_seats}座` })
      return
    }

    if (is_flyable !== undefined) {
      db.prepare('UPDATE schedules SET is_flyable = ? WHERE id = ?').run(is_flyable ? 1 : 0, req.params.id)
    }
    if (weather_remark !== undefined) {
      db.prepare('UPDATE schedules SET weather_remark = ? WHERE id = ?').run(weather_remark, req.params.id)
    }
    if (total_seats !== undefined) {
      db.prepare('UPDATE schedules SET total_seats = ?, available_seats = ? - ? WHERE id = ?').run(total_seats, total_seats, bookedSeats, req.params.id)
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新排班失败' })
  }
})

router.delete('/schedule/:id', authMiddleware, adminMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id) as any
    if (!schedule) {
      res.status(404).json({ success: false, error: '排班不存在' })
      return
    }

    const bookedSeats = schedule.total_seats - schedule.available_seats
    if (bookedSeats > 0) {
      res.status(400).json({ success: false, error: '该时段有预约，不能删除' })
      return
    }

    db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除排班失败' })
  }
})

router.put('/fly-status', authMiddleware, adminMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { schedule_id, is_flyable, weather_remark } = req.body
    db.prepare('UPDATE schedules SET is_flyable = ?, weather_remark = ? WHERE id = ?')
      .run(is_flyable ? 1 : 0, weather_remark || '', schedule_id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新适飞状态失败' })
  }
})

router.get('/orders', authMiddleware, adminMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { status, date } = req.query
    let orders
    if (status) {
      orders = db.prepare(`
        SELECT o.*, r.name as route_name, u.name as user_name, u.phone as user_phone,
               s.flight_date, s.time_slot, p.name as package_name
        FROM orders o
        JOIN routes r ON o.route_id = r.id
        JOIN users u ON o.user_id = u.id
        JOIN packages p ON o.package_id = p.id
        JOIN schedules s ON o.schedule_id = s.id
        WHERE o.status = ?
        ORDER BY o.created_at DESC
      `).all(status)
    } else if (date) {
      orders = db.prepare(`
        SELECT o.*, r.name as route_name, u.name as user_name, u.phone as user_phone,
               s.flight_date, s.time_slot, p.name as package_name
        FROM orders o
        JOIN routes r ON o.route_id = r.id
        JOIN users u ON o.user_id = u.id
        JOIN packages p ON o.package_id = p.id
        JOIN schedules s ON o.schedule_id = s.id
        WHERE s.flight_date = ?
        ORDER BY o.created_at DESC
      `).all(date)
    } else {
      orders = db.prepare(`
        SELECT o.*, r.name as route_name, u.name as user_name, u.phone as user_phone,
               s.flight_date, s.time_slot, p.name as package_name
        FROM orders o
        JOIN routes r ON o.route_id = r.id
        JOIN users u ON o.user_id = u.id
        JOIN packages p ON o.package_id = p.id
        JOIN schedules s ON o.schedule_id = s.id
        ORDER BY o.created_at DESC
        LIMIT 200
      `).all()
    }
    res.json({ success: true, data: orders })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取订单失败' })
  }
})

router.put('/orders/:id', authMiddleware, adminMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { status } = req.body
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '处理订单失败' })
  }
})

router.post('/photos/upload', authMiddleware, adminMiddleware, upload.array('photos', 10), (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const files = req.files as Express.Multer.File[]
    const { order_id } = req.body

    if (!order_id) {
      res.status(400).json({ success: false, error: '缺少订单ID' })
      return
    }

    const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get(order_id) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    if (order.status !== 'completed') {
      res.status(400).json({ success: false, error: '只有已完成飞行的订单才能上传照片' })
      return
    }

    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: '请选择照片文件' })
      return
    }

    const insertStmt = db.prepare('INSERT INTO photos (order_id, url) VALUES (?, ?)')
    for (const file of files) {
      const url = `/uploads/${file.filename}`
      insertStmt.run(order_id, url)
    }

    res.json({ success: true, data: { count: files.length } })
  } catch (error) {
    res.status(500).json({ success: false, error: '上传照片失败' })
  }
})

router.get('/statistics', authMiddleware, adminMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()

    const totalRevenue = db.prepare("SELECT COALESCE(SUM(final_price), 0) as total FROM orders WHERE status IN ('paid', 'completed')").get() as any
    const totalOrders = db.prepare("SELECT COUNT(*) as total FROM orders").get() as any
    const paidOrders = db.prepare("SELECT COUNT(*) as total FROM orders WHERE status IN ('paid', 'completed')").get() as any
    const refundedAmount = db.prepare("SELECT COALESCE(SUM(final_price), 0) as total FROM orders WHERE status = 'refunded'").get() as any

    const dailyRevenue = db.prepare(`
      SELECT s.flight_date as date, SUM(o.final_price) as revenue, COUNT(o.id) as count
      FROM orders o
      JOIN schedules s ON o.schedule_id = s.id
      WHERE o.status IN ('paid', 'completed')
      GROUP BY s.flight_date
      ORDER BY s.flight_date
      LIMIT 30
    `).all()

    const routeRevenue = db.prepare(`
      SELECT r.name, SUM(o.final_price) as revenue, COUNT(o.id) as count
      FROM orders o
      JOIN routes r ON o.route_id = r.id
      WHERE o.status IN ('paid', 'completed')
      GROUP BY o.route_id
    `).all()

    const packageRevenue = db.prepare(`
      SELECT p.name, SUM(o.final_price) as revenue, COUNT(o.id) as count
      FROM orders o
      JOIN packages p ON o.package_id = p.id
      WHERE o.status IN ('paid', 'completed')
      GROUP BY o.package_id
    `).all()

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: totalRevenue.total,
          totalOrders: totalOrders.total,
          paidOrders: paidOrders.total,
          refundedAmount: refundedAmount.total
        },
        dailyRevenue,
        routeRevenue,
        packageRevenue
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取统计数据失败' })
  }
})

export default router
