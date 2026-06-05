import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb } from '../database.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'skyview_secret_2026'

function generateToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' })
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, name, password, id_card } = req.body
    if (!phone || !password) {
      res.status(400).json({ success: false, error: '手机号和密码不能为空' })
      return
    }

    const db = getDb()
    const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)
    if (existing) {
      res.status(400).json({ success: false, error: '该手机号已注册' })
      return
    }

    const passwordHash = bcrypt.hashSync(password, 10)
    const result = db.prepare('INSERT INTO users (phone, name, id_card, role, password_hash) VALUES (?, ?, ?, ?, ?)').run(phone, name || '', id_card || null, 'tourist', passwordHash)

    const token = generateToken(result.lastInsertRowid as number, 'tourist')
    res.json({ success: true, data: { token, userId: result.lastInsertRowid, role: 'tourist' } })
  } catch (error) {
    res.status(500).json({ success: false, error: '注册失败' })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, password } = req.body
    if (!phone || !password) {
      res.status(400).json({ success: false, error: '手机号和密码不能为空' })
      return
    }

    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone) as any
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      res.status(400).json({ success: false, error: '手机号或密码错误' })
      return
    }

    const token = generateToken(user.id, user.role)
    res.json({ success: true, data: { token, userId: user.id, role: user.role, name: user.name } })
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

router.get('/me', (req: Request, res: Response): void => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      res.status(401).json({ success: false, error: '未登录' })
      return
    }

    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string }

    const db = getDb()
    const user = db.prepare('SELECT id, phone, name, id_card, role FROM users WHERE id = ?').get(decoded.userId) as any
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }

    res.json({ success: true, data: user })
  } catch (error) {
    res.status(401).json({ success: false, error: '登录已过期' })
  }
})

export default router

export function authMiddleware(req: Request, res: Response, next: Function): void {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    res.status(401).json({ success: false, error: '未登录' })
    return
  }

  try {
    const token = authHeader.replace('Bearer ', '')
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; role: string }
    ;(req as any).user = decoded
    next()
  } catch {
    res.status(401).json({ success: false, error: '登录已过期' })
  }
}

export function adminMiddleware(req: Request, res: Response, next: Function): void {
  const user = (req as any).user
  if (!user || user.role !== 'admin') {
    res.status(403).json({ success: false, error: '无管理权限' })
    return
  }
  next()
}
