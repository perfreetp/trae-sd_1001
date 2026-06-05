import { Router, type Request, type Response } from 'express'
import { getDb } from '../database.js'
import { authMiddleware, adminMiddleware } from './auth.js'

const router = Router()

router.get('/faq', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const faqs = db.prepare('SELECT * FROM faq ORDER BY sort_order').all()
    res.json({ success: true, data: faqs })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取FAQ失败' })
  }
})

router.post('/', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const userId = (req as any).user.userId
    const { content } = req.body

    db.prepare('INSERT INTO chat_messages (user_id, content, sender) VALUES (?, ?, ?)').run(userId, content, 'user')

    let reply = '感谢您的咨询！我们的客服人员会尽快回复您。如需紧急帮助，请拨打服务热线：400-888-9999。'

    const lowerContent = content.toLowerCase()
    if (lowerContent.includes('天气') || lowerContent.includes('飞')) {
      reply = '您好！目前景区天气状况良好，各航线均可正常飞行。建议您提前1-2天预约，以确保有座位哦！如有天气变化，我们会提前2小时通知您。'
    } else if (lowerContent.includes('退') || lowerContent.includes('取消')) {
      reply = '退票规则：起飞前48小时全额退款，24-48小时扣30%手续费，24小时内扣50%手续费。您可以在订单中心操作退票，退款将原路返回。'
    } else if (lowerContent.includes('改签') || lowerContent.includes('换')) {
      reply = '已支付的订单可以在订单中心申请改签，选择新的日期和时段即可。改签不收取额外费用，但需要有余座才行哦！'
    } else if (lowerContent.includes('价格') || lowerContent.includes('多少钱') || lowerContent.includes('费用')) {
      reply = '我们的航线价格：峡谷穿越580-1280元，茶山云海780-1380元，古村鸟瞰580-980元，根据套餐不同价格有差异。现在还有优惠券可以领取哦！'
    } else if (lowerContent.includes('集合') || lowerContent.includes('地址') || lowerContent.includes('导航')) {
      reply = '各航线集合点：峡谷穿越-峡谷景区东门停机坪，茶山云海-茶山游客中心，古村鸟瞰-古村景区南门广场。建议提前30分钟到达，以便进行安全培训。'
    }

    db.prepare('INSERT INTO chat_messages (user_id, content, sender) VALUES (?, ?, ?)').run(userId, reply, 'bot')

    res.json({ success: true, data: { reply } })
  } catch (error) {
    res.status(500).json({ success: false, error: '发送消息失败' })
  }
})

router.get('/history', authMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const userId = (req as any).user.userId
    const messages = db.prepare('SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC').all(userId)
    res.json({ success: true, data: messages })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取聊天记录失败' })
  }
})

router.get('/admin/chats', authMiddleware, adminMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const users = db.prepare(`
      SELECT u.id, u.name, u.phone,
        (SELECT COUNT(*) FROM chat_messages WHERE user_id = u.id AND sender = 'user') as msg_count,
        (SELECT created_at FROM chat_messages WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as last_msg_time
      FROM users u
      WHERE u.id IN (SELECT DISTINCT user_id FROM chat_messages)
      ORDER BY last_msg_time DESC
    `).all()
    res.json({ success: true, data: users })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取聊天列表失败' })
  }
})

router.get('/admin/chats/:userId', authMiddleware, adminMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const messages = db.prepare(`
      SELECT cm.*, u.name as user_name, u.phone as user_phone
      FROM chat_messages cm
      JOIN users u ON cm.user_id = u.id
      WHERE cm.user_id = ?
      ORDER BY cm.created_at ASC
    `).all(req.params.userId)
    res.json({ success: true, data: messages })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取聊天记录失败' })
  }
})

router.post('/admin/reply', authMiddleware, adminMiddleware, (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { user_id, content } = req.body
    if (!user_id || !content) {
      res.status(400).json({ success: false, error: '参数不完整' })
      return
    }
    db.prepare('INSERT INTO chat_messages (user_id, content, sender) VALUES (?, ?, ?)').run(user_id, content, 'admin')
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '回复失败' })
  }
})

export default router
