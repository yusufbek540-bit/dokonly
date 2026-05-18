import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sidebar } from './Sidebar'
import { GlobalSearch } from './GlobalSearch'
import { AIHelperPanel } from './AIHelperPanel'
import { api } from '@/lib/api'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'только что'
  if (mins < 60) return `${mins} мин назад`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ч назад`
  return `${Math.floor(hrs / 24)} д назад`
}

export function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const gKeyRef = useRef(false)
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.notifications.list,
    refetchInterval: 30_000,
    retry: false,
  })

  const markRead = useMutation({
    mutationFn: api.notifications.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllRead = useMutation({
    mutationFn: api.notifications.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unreadCount = (notifications as any[]).filter((n) => !n.read_at).length

  const TYPE_ICONS: Record<string, string> = {
    order: '🛒', payment: '💳', system: '⚙️', support: '💬',
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      // Cmd+K / Ctrl+K — global search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
        return
      }

      // Cmd+J / Ctrl+J — toggle theme (placeholder)
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        document.documentElement.classList.toggle('dark')
        return
      }

      // Esc — close modals
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setAiOpen(false)
        return
      }

      if (isInput) return

      // ? — show shortcuts hint (just open search with hint)
      if (e.key === '?') {
        setSearchOpen(true)
        return
      }

      // / — focus search
      if (e.key === '/') {
        e.preventDefault()
        setSearchOpen(true)
        return
      }

      // G then letter — navigation shortcuts
      if (e.key === 'g' || e.key === 'G') {
        gKeyRef.current = true
        if (gTimerRef.current) clearTimeout(gTimerRef.current)
        gTimerRef.current = setTimeout(() => { gKeyRef.current = false }, 1000)
        return
      }

      if (gKeyRef.current) {
        gKeyRef.current = false
        if (gTimerRef.current) clearTimeout(gTimerRef.current)
        const map: Record<string, string> = {
          o: '/orders', O: '/orders',
          c: '/products', C: '/products',
          a: '/analytics', A: '/analytics',
          s: '/settings', S: '/settings',
          m: '/marketing', M: '/marketing',
          r: '/customers', R: '/customers',
          t: '/team', T: '/team',
          p: '/platform', P: '/platform',
        }
        if (map[e.key]) {
          navigate(map[e.key])
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (gTimerRef.current) clearTimeout(gTimerRef.current)
    }
  }, [navigate])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar onAIToggle={() => setAiOpen((v) => !v)} aiOpen={aiOpen} onSearchOpen={() => setSearchOpen(true)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white border-b flex items-center justify-between px-8 py-3 h-14">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {/* Notifications bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-50 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-0.5">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications panel */}
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <span className="font-semibold text-sm">Уведомления</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => markAllRead.mutate()}
                        className="text-xs text-accent hover:underline"
                      >
                        Отметить все прочитанными
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {(notifications as any[]).length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <p className="text-2xl mb-2">🔔</p>
                        <p className="text-sm">Нет уведомлений</p>
                      </div>
                    ) : (
                      (notifications as any[]).map((n: any) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.read_at) markRead.mutate(n.id)
                            if (n.action_url) navigate(n.action_url)
                            setNotifOpen(false)
                          }}
                          className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer transition-colors hover:bg-gray-50 ${!n.read_at ? 'bg-blue-50/50' : ''}`}
                        >
                          <span className="text-lg mt-0.5 flex-shrink-0">{TYPE_ICONS[n.type] ?? '🔔'}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!n.read_at ? 'font-semibold' : 'font-medium'} text-gray-800`}>{n.title}</p>
                            {n.body && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>}
                            <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.read_at && (
                            <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <main className="flex-1 p-8 overflow-auto">
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* AI Helper Panel */}
      {aiOpen && (
        <div className="w-80 bg-white border-l flex flex-col flex-shrink-0">
          <AIHelperPanel onClose={() => setAiOpen(false)} />
        </div>
      )}

      {/* Global Search Modal */}
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </div>
  )
}
