import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dataDir = path.join(__dirname, 'data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const dbPath = path.join(dataDir, 'app.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function initDb() {
  const database = getDb()

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL UNIQUE,
      name TEXT,
      id_card TEXT,
      role TEXT NOT NULL DEFAULT 'tourist',
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      cover_image TEXT,
      type TEXT NOT NULL,
      duration INTEGER NOT NULL,
      altitude INTEGER,
      distance REAL,
      departure_point TEXT,
      departure_coords TEXT,
      max_passengers INTEGER DEFAULT 4,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL REFERENCES routes(id),
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      includes TEXT
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL REFERENCES routes(id),
      flight_date DATE NOT NULL,
      time_slot TEXT NOT NULL,
      total_seats INTEGER NOT NULL,
      available_seats INTEGER NOT NULL,
      is_flyable BOOLEAN DEFAULT 1,
      weather_remark TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id),
      route_id INTEGER NOT NULL REFERENCES routes(id),
      package_id INTEGER NOT NULL REFERENCES packages(id),
      schedule_id INTEGER NOT NULL REFERENCES schedules(id),
      seat_no TEXT NOT NULL,
      passenger_name TEXT NOT NULL,
      passenger_id_card TEXT NOT NULL,
      passenger_phone TEXT NOT NULL,
      passenger_weight REAL,
      original_price REAL NOT NULL,
      discount_amount REAL DEFAULT 0,
      final_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      coupon_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      paid_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      value REAL NOT NULL,
      min_amount REAL DEFAULT 0,
      total_count INTEGER NOT NULL,
      claimed_count INTEGER DEFAULT 0,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS user_coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      coupon_id INTEGER NOT NULL REFERENCES coupons(id),
      is_used BOOLEAN DEFAULT 0,
      order_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      route_id INTEGER NOT NULL REFERENCES routes(id),
      rating INTEGER NOT NULL,
      content TEXT,
      images TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      url TEXT NOT NULL,
      taken_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      sender TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS faq (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );
  `)

  seedData(database)
}

function seedData(db: Database.Database) {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (userCount.count > 0) return

  const insertUser = db.prepare(`
    INSERT INTO users (phone, name, id_card, role, password_hash) VALUES (?, ?, ?, ?, ?)
  `)

  const hash = bcrypt.hashSync('123456', 10)
  insertUser.run('13800001111', '张三', '330102199001011234', 'tourist', hash)
  insertUser.run('13800002222', '李四', '330102199205052345', 'tourist', hash)
  insertUser.run('13900009999', '管理员', null, 'admin', bcrypt.hashSync('admin123', 10))

  const insertRoute = db.prepare(`
    INSERT INTO routes (name, description, cover_image, type, duration, altitude, distance, departure_point, departure_coords, max_passengers) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  insertRoute.run(
    '峡谷穿越',
    '乘坐小型直升机穿越壮美峡谷，俯瞰蜿蜒河流与层叠峭壁，感受大自然的鬼斧神工。飞行途中可清晰看到峡谷深处溪流潺潺、两岸绿植覆盖，是摄影爱好者的绝佳选择。',
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Deep%20canyon%20aerial%20view%20with%20winding%20river%20and%20layered%20cliffs%2C%20lush%20green%20vegetation%2C%20dramatic%20morning%20light%2C%20photorealistic%20landscape&image_size=landscape_16_9',
    'canyon',
    25,
    800,
    12.5,
    '峡谷景区东门停机坪',
    '29.1234,103.5678',
    4
  )

  insertRoute.run(
    '茶山云海',
    '飞跃连绵茶山，云雾缭绕间品味茶乡韵味。清晨时分，茶山顶部常被薄雾笼罩，形成壮观的云海奇景。从空中俯瞰，整齐排列的茶树梯田如同大地的绿色指纹。',
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Tea%20mountain%20terraces%20aerial%20view%20with%20morning%20mist%20and%20cloud%20sea%2C%20emerald%20green%20tea%20plantations%2C%20golden%20sunrise%2C%20photorealistic&image_size=landscape_16_9',
    'tea',
    30,
    1000,
    15.0,
    '茶山游客中心',
    '29.2345,103.6789',
    4
  )

  insertRoute.run(
    '古村鸟瞰',
    '从空中鸟瞰百年古村落，青瓦白墙、小桥流水尽收眼底。古村依山傍水，保留着完整的明清建筑群，从高空俯视，整个村落呈八卦布局，令人叹为观止。',
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Ancient%20Chinese%20village%20aerial%20view%2C%20traditional%20architecture%20with%20dark%20roofs%20and%20white%20walls%2C%20winding%20river%2C%20surrounded%20by%20mountains%2C%20photorealistic&image_size=landscape_16_9',
    'village',
    20,
    600,
    8.0,
    '古村景区南门广场',
    '29.3456,103.7890',
    6
  )

  const insertPackage = db.prepare(`
    INSERT INTO packages (route_id, name, description, price, includes) VALUES (?, ?, ?, ?, ?)
  `)

  insertPackage.run(1, '标准票', '峡谷穿越标准体验', 680, '直升机乘坐25分钟+飞行保险+安全装备')
  insertPackage.run(1, 'VIP票', '峡谷穿越尊享体验', 980, '直升机乘坐25分钟+飞行保险+安全装备+专业航拍照片5张+优先选座')
  insertPackage.run(1, '情侣套票', '峡谷穿越浪漫双人', 1280, '直升机乘坐25分钟(2人)+飞行保险+安全装备+双人合影+鲜花一束')

  insertPackage.run(2, '标准票', '茶山云海标准体验', 780, '热气球体验30分钟+飞行保险+安全装备')
  insertPackage.run(2, 'VIP票', '茶山云海尊享体验', 1080, '热气球体验30分钟+飞行保险+安全装备+专业航拍照片5张+茶山特产伴手礼')
  insertPackage.run(2, '情侣套票', '茶山云海浪漫双人', 1380, '热气球体验30分钟(2人)+飞行保险+安全装备+双人合影+茶山特产伴手礼')

  insertPackage.run(3, '标准票', '古村鸟瞰标准体验', 580, '滑翔伞体验20分钟+飞行保险+安全装备')
  insertPackage.run(3, 'VIP票', '古村鸟瞰尊享体验', 880, '滑翔伞体验20分钟+飞行保险+安全装备+专业航拍照片5张+古村手工艺品')
  insertPackage.run(3, '情侣套票', '古村鸟瞰浪漫双人', 980, '双人滑翔伞体验20分钟+飞行保险+安全装备+双人合影+古村特色午餐')

  const insertSchedule = db.prepare(`
    INSERT INTO schedules (route_id, flight_date, time_slot, total_seats, available_seats, is_flyable, weather_remark) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const today = new Date()
  const dates: string[] = []
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().split('T')[0])
  }

  const timeSlots = ['08:00-08:30', '09:00-09:30', '10:00-10:30', '11:00-11:30', '14:00-14:30', '15:00-15:30', '16:00-16:30']

  for (const date of dates) {
    for (let routeId = 1; routeId <= 3; routeId++) {
      const slotCount = routeId === 3 ? 5 : 4
      for (let t = 0; t < slotCount; t++) {
        const totalSeats = routeId === 3 ? 6 : 4
        const availSeats = Math.floor(Math.random() * (totalSeats + 1))
        const isFlyable = Math.random() > 0.15
        insertSchedule.run(
          routeId,
          date,
          timeSlots[t],
          totalSeats,
          availSeats,
          isFlyable ? 1 : 0,
          isFlyable ? '天气晴好，适宜飞行' : '风力偏大，暂不适合飞行'
        )
      }
    }
  }

  const insertCoupon = db.prepare(`
    INSERT INTO coupons (name, type, value, min_amount, total_count, claimed_count, start_date, end_date, is_active) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  insertCoupon.run('新人专享券', 'fixed', 50, 500, 100, 0, dates[0], dates[13], 1)
  insertCoupon.run('早鸟9折券', 'percent', 10, 0, 50, 0, dates[0], dates[7], 1)
  insertCoupon.run('满800减100', 'fixed', 100, 800, 80, 0, dates[0], dates[13], 1)
  insertCoupon.run('情侣票特惠', 'percent', 15, 1000, 60, 0, dates[0], dates[13], 1)

  const insertFaq = db.prepare(`
    INSERT INTO faq (question, answer, sort_order) VALUES (?, ?, ?)
  `)

  insertFaq.run('飞行安全吗？', '所有飞行器均经过严格检测，飞行员持证上岗，每次飞行前都会进行安全检查。飞行全程配备安全装备，并有地面人员实时监控。', 1)
  insertFaq.run('天气不好能飞吗？', '安全第一！当风力超过5级、能见度低于2公里或有雷暴天气时，航班将自动取消并全额退款。出发前2小时会通过短信通知。', 2)
  insertFaq.run('可以带宠物吗？', '抱歉，出于安全考虑，飞行器内不允许携带宠物。', 3)
  insertFaq.run('小孩可以乘坐吗？', '6岁以上儿童可在成人陪同下乘坐，12岁以上可单独乘坐（需家长签署同意书）。6岁以下不建议乘坐。', 4)
  insertFaq.run('如何退票？', '起飞前48小时退票全额退款，24-48小时退票扣30%手续费，24小时内退票扣50%手续费，起飞后不予退款。', 5)
  insertFaq.run('需要提前多久到达集合点？', '建议提前30分钟到达集合点，以便完成安全培训和装备穿戴。', 6)
  insertFaq.run('飞行中可以拍照吗？', '可以！但请确保设备有挂绳固定。我们也提供专业航拍服务，可在购票时选择VIP套餐。', 7)

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_no, user_id, route_id, package_id, schedule_id, seat_no, passenger_name, passenger_id_card, passenger_phone, passenger_weight, original_price, discount_amount, final_price, status, coupon_id, created_at, paid_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  insertOrder.run('FLY20260605001', 1, 1, 1, 1, 'A1', '张三', '330102199001011234', '13800001111', 70, 680, 50, 630, 'completed', 1, '2026-06-01 10:00:00', '2026-06-01 10:05:00')
  insertOrder.run('FLY20260605002', 1, 2, 4, 8, 'B1', '张三', '330102199001011234', '13800001111', 70, 780, 0, 780, 'paid', null, '2026-06-03 14:00:00', '2026-06-03 14:05:00')
  insertOrder.run('FLY20260605003', 2, 3, 8, 15, 'C2', '李四', '330102199205052345', '13800002222', 65, 580, 0, 580, 'pending', null, '2026-06-04 09:00:00', null)

  const insertReview = db.prepare(`
    INSERT INTO reviews (order_id, user_id, route_id, rating, content, images) VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertReview.run(1, 1, 1, 5, '太震撼了！从空中看峡谷和地面上完全不同，河水碧绿，峭壁壮观，飞行员非常专业，强烈推荐！', '')

  const insertPhoto = db.prepare(`
    INSERT INTO photos (order_id, url) VALUES (?, ?)
  `)
  insertPhoto.run(1, 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Aerial%20photography%20of%20deep%20canyon%20with%20emerald%20river%2C%20dramatic%20cliffs%2C%20morning%20golden%20light%2C%20professional%20drone%20shot&image_size=landscape_16_9')
  insertPhoto.run(1, 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Helicopter%20cockpit%20view%20of%20canyon%20river%20valley%2C%20panoramic%20mountain%20landscape%2C%20adventure%20travel%20photography&image_size=landscape_16_9')
  insertPhoto.run(1, 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Bird%20eye%20view%20of%20winding%20river%20through%20canyon%2C%20lush%20green%20forest%2C%20natural%20wonder%20aerial%20shot&image_size=landscape_16_9')

  const insertChat = db.prepare(`
    INSERT INTO chat_messages (user_id, content, sender) VALUES (?, ?, ?)
  `)
  insertChat.run(1, '请问明天可以飞吗？', 'user')
  insertChat.run(1, '您好！明天的天气状况良好，目前显示适飞，建议您尽早预约哦～', 'bot')
}
