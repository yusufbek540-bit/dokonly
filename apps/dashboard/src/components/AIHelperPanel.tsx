import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

const SUGGESTIONS = [
  'Как продажи сегодня?',
  'Найди товары без описания',
  'Сформируй рассылку для VIP-клиентов',
  'Какой товар самый популярный?',
]

interface AIHelperPanelProps {
  onClose: () => void
}

export function AIHelperPanel({ onClose }: AIHelperPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: analytics } = useQuery({
    queryKey: ['merchant-analytics'],
    queryFn: () => api.merchant.analytics(),
    retry: false,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const enrichedMessages: Message[] = analytics
        ? [
            {
              role: 'system' as const,
              content: `Ты ИИ-помощник продавца в Dokonly. Контекст: выручка сегодня — ${analytics.revenue_today ?? 'н/д'}, заказов — ${analytics.orders_today ?? 'н/д'}. Отвечай кратко и по делу на русском.`,
            },
            ...next,
          ]
        : next
      const data = await api.merchant.aiChat(enrichedMessages)
      setMessages([...next, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Ошибка при обращении к ИИ. Попробуйте ещё раз.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <p className="font-semibold text-sm">ИИ-помощник</p>
            <p className="text-xs text-gray-400">Спросите о магазине</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 text-center">Попробуйте спросить:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-left text-sm px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                m.role === 'user'
                  ? 'bg-accent text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}>
                {m.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-sm">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="Задайте вопрос..."
            rows={1}
            className="flex-1 text-sm border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-accent/30 max-h-24"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-9 h-9 bg-accent text-white rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-accent/90 transition-colors flex-shrink-0"
          >
            <span className="text-sm">↑</span>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">Business+ функция</p>
      </div>
    </div>
  )
}
