import { useParams, useNavigate } from 'react-router-dom'
import { Star, MessageCircle, Image, Download, Send, Phone } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { apiFetch, useAppStore } from '@/store/useAppStore'

interface Photo {
  id: number
  url: string
}

interface ChatMessage {
  id: number
  content: string
  sender: string
  created_at: string
}

interface FAQ {
  id: number
  question: string
  answer: string
}

export default function Review() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { user, token, chatMessages, setChatMessages, addChatMessage } = useAppStore()
  const [activeTab, setActiveTab] = useState<'review' | 'photos' | 'chat'>('review')
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [chatInput, setChatInput] = useState('')
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [orderInfo, setOrderInfo] = useState<any>(null)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewData, setReviewData] = useState<any>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) { navigate('/login'); return }
    if (!user) return

    apiFetch('/api/faq').then((res) => {
      if (res.success && res.data) setFaqs(res.data)
    })

    if (chatMessages.length === 0) {
      apiFetch('/api/chat/history').then((res) => {
        if (res.success && res.data) setChatMessages(res.data)
      })
    }

    if (orderId && orderId !== '0') {
      apiFetch(`/api/reviews/photos/${orderId}`).then((res) => {
        if (res.success && res.data) setPhotos(res.data)
      })
      apiFetch(`/api/orders/${orderId}`).then((res) => {
        if (res.success && res.data) setOrderInfo(res.data)
      })
      apiFetch(`/api/reviews/order/${orderId}`).then((res) => {
        if (res.success && res.data) setReviewData(res.data)
      })
    }
  }, [orderId, user])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (activeTab === 'photos' && orderId && orderId !== '0') {
      apiFetch(`/api/reviews/photos/${orderId}`).then((res) => {
        if (res.success && res.data) setPhotos(res.data)
      })
    }
  }, [activeTab, orderId])

  const handleSubmitReview = async () => {
    if (!content.trim()) { alert('请输入评价内容'); return }
    const oid = orderId && orderId !== '0' ? Number(orderId) : null
    if (!oid || !orderInfo) { alert('无法提交评价'); return }

    const res = await apiFetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({
        order_id: oid,
        route_id: orderInfo.route_id,
        rating,
        content,
      }),
    })
    if (res.success) {
      setReviewSubmitted(true)
    } else {
      alert(res.error || '评价失败')
    }
  }

  const handleSendChat = async () => {
    if (!chatInput.trim()) return
    const msg = chatInput
    setChatInput('')
    addChatMessage({ id: Date.now(), content: msg, sender: 'user', created_at: new Date().toISOString() })

    const res = await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ content: msg }),
    })
    if (res.success && res.data) {
      addChatMessage({ id: Date.now() + 1, content: res.data.reply, sender: 'bot', created_at: new Date().toISOString() })
    }
  }

  const refreshChatHistory = async () => {
    const res = await apiFetch('/api/chat/history')
    if (res.success && res.data) setChatMessages(res.data)
  }

  useEffect(() => {
    if (activeTab === 'chat' && user) refreshChatHistory()
  }, [activeTab, user])

  return (
    <div className="min-h-screen bg-cloud pt-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-serif-sc text-2xl font-bold text-deep mb-6">评价与客服</h1>

        <div className="flex gap-2 mb-6">
          {[
            { key: 'review' as const, label: '飞行评价', icon: Star },
            { key: 'photos' as const, label: '飞行照片', icon: Image },
            { key: 'chat' as const, label: '在线客服', icon: MessageCircle },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                activeTab === tab.key ? 'gradient-sky text-white shadow-lg shadow-sky-200' : 'bg-white text-rock hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'review' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm animate-fade-in-up">
            {!orderId || orderId === '0' || !orderInfo ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-semibold text-deep mb-2">请从订单进入评价</h3>
                <p className="text-rock text-sm mb-4">评价需要关联具体订单，请前往订单列表选择要评价的订单</p>
                <button onClick={() => navigate('/orders')} className="px-6 py-2 rounded-xl gradient-sky text-white text-sm font-medium shadow-lg shadow-sky-200">
                  查看我的订单
                </button>
              </div>
            ) : orderInfo.status !== 'completed' ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 text-amber-300 mx-auto mb-4" />
                <h3 className="font-semibold text-deep mb-2">订单尚未完成飞行</h3>
                <p className="text-rock text-sm mb-4">只有已完成飞行的订单才能进行评价，请完成飞行后再来评价</p>
                <button onClick={() => navigate('/orders')} className="px-6 py-2 rounded-xl gradient-sky text-white text-sm font-medium shadow-lg shadow-sky-200">
                  返回订单列表
                </button>
              </div>
            ) : reviewData ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-gold fill-gold" />
                </div>
                <h3 className="font-serif-sc text-xl font-bold text-deep mb-3">您已评价</h3>
                <div className="flex items-center justify-center gap-1 mb-3">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`w-6 h-6 ${s <= reviewData.rating ? 'text-gold fill-gold' : 'text-gray-200'}`} />
                  ))}
                </div>
                {reviewData.content && (
                  <p className="text-rock text-sm max-w-md mx-auto bg-gray-50 rounded-xl p-4">{reviewData.content}</p>
                )}
              </div>
            ) : reviewSubmitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-gold fill-gold" />
                </div>
                <h3 className="font-serif-sc text-xl font-bold text-deep mb-2">感谢您的评价！</h3>
                <p className="text-rock">您的评价对我们非常重要</p>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-deep mb-4">为本次飞行打分</h3>
                <div className="flex gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110 active:scale-95">
                      <Star className={`w-10 h-10 ${star <= rating ? 'text-gold fill-gold' : 'text-gray-200'}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="分享您的飞行体验吧..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-start focus:ring-2 focus:ring-sky-100 outline-none transition text-sm resize-none"
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={!content.trim()}
                  className="mt-4 px-8 py-3 rounded-xl gradient-sky text-white font-medium shadow-lg shadow-sky-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  提交评价
                </button>
              </>
            )}
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="bg-white rounded-3xl p-6 shadow-sm animate-fade-in-up">
            <h3 className="font-semibold text-deep mb-4">飞行照片</h3>
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo) => {
                  return (
                    <div key={photo.id} className="relative group rounded-2xl overflow-hidden">
                      <img src={photo.url} alt="飞行照片" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                        <a href={photo.url} download target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition p-2 bg-white/90 rounded-full">
                          <Download className="w-5 h-5 text-deep" />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-rock">暂无飞行照片</p>
                <p className="text-sm text-rock/70 mt-1">完成飞行后，摄影师拍摄的照片将在此处展示</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white rounded-3xl shadow-sm overflow-hidden animate-fade-in-up flex flex-col" style={{ height: '500px' }}>
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-deep flex items-center gap-2"><MessageCircle className="w-5 h-5 text-sky-start" /> 在线客服</h3>
            </div>

            {faqs.length > 0 && (
              <div className="px-4 py-3 bg-sky-50/50 border-b border-sky-100">
                <p className="text-xs text-sky-start font-medium mb-2">常见问题</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                  {faqs.map((faq) => (
                    <button
                      key={faq.id}
                      onClick={() => { setChatInput(faq.question) }}
                      className="px-3 py-1.5 rounded-full bg-white text-xs text-deep whitespace-nowrap border border-sky-100 hover:bg-sky-50 transition"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-rock text-sm">有任何问题，随时咨询我们 💬</p>
                </div>
              )}
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.sender === 'user'
                      ? 'gradient-sky text-white rounded-br-md'
                      : msg.sender === 'admin'
                      ? 'bg-green-50 text-green-800 rounded-bl-md'
                      : 'bg-gray-100 text-deep rounded-bl-md'
                  }`}>
                    {msg.content}
                    {msg.sender === 'admin' && <p className="text-xs text-green-600 mt-1">管理员回复</p>}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="输入您的问题..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:border-sky-start focus:ring-2 focus:ring-sky-100 outline-none transition text-sm"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                  className="px-4 py-2.5 rounded-xl gradient-sky text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-rock/60 mt-2 text-center">服务热线：400-888-9999</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
