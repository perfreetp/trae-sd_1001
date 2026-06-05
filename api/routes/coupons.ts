import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const coupons = db.prepare('SELECT * FROM coupons WHERE is_active = 1 AND end_date >= date("now")').all()
    res.json({ success: true, data: coupons })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取优惠券失败' })
  }
})

router.post('/:id/claim', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const userId = (req as any).user.userId
    const couponId = req.params.id

    const coupon = db.prepare('SELECT * FROM coupons WHERE id = ? AND is_active = 1').get(couponId) as any
    if (!coupon) {
      res.status(404).json({ success: false, error: '优惠券不存在' })
      return
    }
    if (coupon.claimed_count >= coupon.total_count) {
      res.status(400).json({ success: false, error: '优惠券已被领完' })
      return
    }

    const existing = db.prepare('SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ?').get(userId, couponId)
    if (existing) {
      res.status(400).json({ success: false, error: '已领取过该优惠券' })
      return
    }

    db.prepare('INSERT INTO user_coupons (user_id, coupon_id) VALUES (?, ?)').run(userId, couponId)
    db.prepare('UPDATE coupons SET claimed_count = claimed_count + 1 WHERE id = ?').run(couponId)

    res.json({ success: true, data: { couponId } })
  } catch (error) {
    res.status(500).json({ success: false, error: '领取失败' })
  }
})

router.get('/user', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const userId = (req as any).user.userId
    const coupons = db.prepare(`
      SELECT uc.*, c.name, c.type, c.value, c.min_amount, c.start_date, c.end_date
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.user_id = ?
      ORDER BY uc.is_used ASC, c.end_date ASC
    `).all(userId)
    res.json({ success: true, data: coupons })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户优惠券失败' })
  }
})

export default router
