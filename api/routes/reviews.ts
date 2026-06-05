import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware } from './auth.js'

const router = Router()

router.post('/', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const userId = (req as any).user.userId
    const { order_id, route_id, rating, content, images } = req.body

    db.prepare('INSERT INTO reviews (order_id, user_id, route_id, rating, content, images) VALUES (?, ?, ?, ?, ?, ?)')
      .run(order_id, userId, route_id, rating, content || '', images || '')

    db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").run(order_id)

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '提交评价失败' })
  }
})

router.get('/route/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const reviews = db.prepare(`
      SELECT r.*, u.name as user_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.route_id = ?
      ORDER BY r.created_at DESC
    `).all(req.params.id)
    res.json({ success: true, data: reviews })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取评价失败' })
  }
})

router.get('/photos/:orderId', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const photos = db.prepare('SELECT * FROM photos WHERE order_id = ?').all(req.params.orderId)
    res.json({ success: true, data: photos })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取照片失败' })
  }
})

router.get('/order/:orderId', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const review = db.prepare('SELECT * FROM reviews WHERE order_id = ?').get(req.params.orderId)
    res.json({ success: true, data: review || null })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取评价状态失败' })
  }
})

export default router
