import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'

const router = Router()

router.get('/', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { status } = req.query
    const userId = (req as any).user.userId

    let orders
    if (status && status !== 'all') {
      orders = db.prepare(`
        SELECT o.*, r.name as route_name, r.type as route_type, r.cover_image, p.name as package_name,
               s.flight_date, s.time_slot
        FROM orders o
        JOIN routes r ON o.route_id = r.id
        JOIN packages p ON o.package_id = p.id
        JOIN schedules s ON o.schedule_id = s.id
        WHERE o.user_id = ? AND o.status = ?
        ORDER BY o.created_at DESC
      `).all(userId, status)
    } else {
      orders = db.prepare(`
        SELECT o.*, r.name as route_name, r.type as route_type, r.cover_image, p.name as package_name,
               s.flight_date, s.time_slot
        FROM orders o
        JOIN routes r ON o.route_id = r.id
        JOIN packages p ON o.package_id = p.id
        JOIN schedules s ON o.schedule_id = s.id
        WHERE o.user_id = ?
        ORDER BY o.created_at DESC
      `).all(userId)
    }
    res.json({ success: true, data: orders })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取订单失败' })
  }
})

router.get('/:id', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const order = db.prepare(`
      SELECT o.*, r.name as route_name, r.type as route_type, r.cover_image, r.departure_point, r.departure_coords,
             p.name as package_name, s.flight_date, s.time_slot
      FROM orders o
      JOIN routes r ON o.route_id = r.id
      JOIN packages p ON o.package_id = p.id
      JOIN schedules s ON o.schedule_id = s.id
      WHERE o.id = ?
    `).get(req.params.id) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    res.json({ success: true, data: order })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取订单详情失败' })
  }
})

router.post('/', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const userId = (req as any).user.userId
    const { route_id, package_id, schedule_id, seat_no, passenger_name, passenger_id_card, passenger_phone, passenger_weight, coupon_id } = req.body

    const pkg = db.prepare('SELECT * FROM packages WHERE id = ?').get(package_id) as any
    if (!pkg) {
      res.status(400).json({ success: false, error: '套餐不存在' })
      return
    }

    const schedule = db.prepare('SELECT * FROM schedules WHERE id = ?').get(schedule_id) as any
    if (!schedule || !schedule.is_flyable) {
      res.status(400).json({ success: false, error: '该时段不可预约' })
      return
    }

    if (schedule.available_seats <= 0) {
      res.status(400).json({ success: false, error: '该时段已满' })
      return
    }

    const existingSeat = db.prepare('SELECT id FROM orders WHERE schedule_id = ? AND seat_no = ? AND status != ?').get(schedule_id, seat_no, 'cancelled')
    if (existingSeat) {
      res.status(400).json({ success: false, error: '该座位已被占用' })
      return
    }

    let discountAmount = 0
    if (coupon_id) {
      const userCoupon = db.prepare('SELECT uc.*, c.* FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.user_id = ? AND uc.coupon_id = ? AND uc.is_used = 0').get(userId, coupon_id) as any
      if (userCoupon) {
        if (userCoupon.type === 'fixed') {
          discountAmount = userCoupon.value
        } else {
          discountAmount = pkg.price * (userCoupon.value / 100)
        }
      }
    }

    const originalPrice = pkg.price
    const finalPrice = Math.max(0, originalPrice - discountAmount)
    const orderNo = 'FLY' + Date.now() + Math.floor(Math.random() * 1000)

    const result = db.prepare(`
      INSERT INTO orders (order_no, user_id, route_id, package_id, schedule_id, seat_no, passenger_name, passenger_id_card, passenger_phone, passenger_weight, original_price, discount_amount, final_price, status, coupon_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(orderNo, userId, route_id, package_id, schedule_id, seat_no, passenger_name, passenger_id_card, passenger_phone, passenger_weight, originalPrice, discountAmount, finalPrice, coupon_id || null)

    db.prepare('UPDATE schedules SET available_seats = available_seats - 1 WHERE id = ?').run(schedule_id)

    if (coupon_id) {
      db.prepare('UPDATE user_coupons SET is_used = 1, order_id = ? WHERE user_id = ? AND coupon_id = ?').run(result.lastInsertRowid, userId, coupon_id)
      db.prepare('UPDATE coupons SET claimed_count = claimed_count + 1 WHERE id = ?').run(coupon_id)
    }

    res.json({ success: true, data: { orderId: result.lastInsertRowid, orderNo, finalPrice } })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建订单失败' })
  }
})

router.post('/:id/pay', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const userId = (req as any).user.userId
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    if (order.status !== 'pending') {
      res.status(400).json({ success: false, error: '订单状态不允许支付' })
      return
    }

    db.prepare("UPDATE orders SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id)
    res.json({ success: true, data: { orderId: req.params.id, status: 'paid' } })
  } catch (error) {
    res.status(500).json({ success: false, error: '支付失败' })
  }
})

router.put('/:id/reschedule', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const userId = (req as any).user.userId
    const { schedule_id, seat_no } = req.body
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    if (order.status !== 'paid') {
      res.status(400).json({ success: false, error: '仅已支付订单可改签' })
      return
    }

    db.prepare('UPDATE schedules SET available_seats = available_seats + 1 WHERE id = ?').run(order.schedule_id)
    db.prepare('UPDATE schedules SET available_seats = available_seats - 1 WHERE id = ?').run(schedule_id)
    db.prepare('UPDATE orders SET schedule_id = ?, seat_no = ? WHERE id = ?').run(schedule_id, seat_no, req.params.id)

    res.json({ success: true, data: { orderId: req.params.id } })
  } catch (error) {
    res.status(500).json({ success: false, error: '改签失败' })
  }
})

router.post('/:id/refund', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const userId = (req as any).user.userId
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any
    if (!order) {
      res.status(404).json({ success: false, error: '订单不存在' })
      return
    }
    if (order.status !== 'paid' && order.status !== 'pending') {
      res.status(400).json({ success: false, error: '该订单状态不可退票' })
      return
    }

    db.prepare('UPDATE schedules SET available_seats = available_seats + 1 WHERE id = ?').run(order.schedule_id)
    db.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").run(req.params.id)

    res.json({ success: true, data: { orderId: req.params.id, refundAmount: order.final_price } })
  } catch (error) {
    res.status(500).json({ success: false, error: '退票失败' })
  }
})

router.get('/:id/voucher', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const order = db.prepare(`
      SELECT o.*, r.name as route_name, r.departure_point, s.flight_date, s.time_slot, p.name as package_name
      FROM orders o
      JOIN routes r ON o.route_id = r.id
      JOIN packages p ON o.package_id = p.id
      JOIN schedules s ON o.schedule_id = s.id
      WHERE o.id = ? AND o.status = 'paid'
    `).get(req.params.id) as any

    if (!order) {
      res.status(404).json({ success: false, error: '凭证不存在' })
      return
    }

    res.json({
      success: true,
      data: {
        orderNo: order.order_no,
        routeName: order.route_name,
        packageName: order.package_name,
        flightDate: order.flight_date,
        timeSlot: order.time_slot,
        seatNo: order.seat_no,
        passengerName: order.passenger_name,
        departurePoint: order.departure_point,
        finalPrice: order.final_price
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取凭证失败' })
  }
})

export default router
