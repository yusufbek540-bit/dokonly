import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { GlobalSearch } from './GlobalSearch'
import { AIHelperPanel } from './AIHelperPanel'

export function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const navigate = useNavigate()
  const gKeyRef = useRef(false)
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
          a: '/', A: '/',
          s: '/', S: '/',
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

      <main className="flex-1 p-8 overflow-auto min-w-0">
        <Outlet />
      </main>

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
