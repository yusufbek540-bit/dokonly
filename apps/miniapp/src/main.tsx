import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

// Force full-height / fullscreen immediately on load, detect safe area
;(function () {
  const tg = (window as any).Telegram?.WebApp
  if (!tg) return
  tg.ready?.()
  tg.expand?.()
  tg.disableVerticalSwipes?.()
  if (localStorage.getItem('tg_fullscreen') === '1') {
    tg.requestFullscreen?.()
  }

  function setSafeTop(px: number) {
    document.documentElement.style.setProperty('--tg-safe-top', `${px}px`)
  }

  function updateSafeArea() {
    // No bar in fullscreen mode
    if (tg.isFullscreen) { setSafeTop(0); return }

    // Bot API 7.2+: contentSafeAreaInset is the Telegram bar, safeAreaInset is device notch
    const apiTop = (tg.safeAreaInset?.top ?? 0) + (tg.contentSafeAreaInset?.top ?? 0)
    if (apiTop > 0) { setSafeTop(apiTop); return }

    // Fallback: diff between physical screen height and Telegram's viewport height
    const diff = Math.round(window.screen.height - (tg.viewportHeight || window.innerHeight))
    if (diff > 20 && diff < 200) { setSafeTop(diff); return }

    // Last resort: Telegram header bar is ~56px on most devices
    setSafeTop(56)
  }

  // Run immediately, again after viewport settles, and on any changes
  updateSafeArea()
  setTimeout(updateSafeArea, 200)
  tg.onEvent?.('viewportChanged', updateSafeArea)
  tg.onEvent?.('safeAreaChanged', updateSafeArea)
  tg.onEvent?.('contentSafeAreaChanged', updateSafeArea)
  tg.onEvent?.('fullscreenChanged', updateSafeArea)
})()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    const { error } = this.state
    if (error) {
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', fontSize: 13, color: '#dc2626', background: '#fff1f2', minHeight: '100vh' }}>
          <strong>Crash:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{(error as Error).message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#888', marginTop: 8 }}>{(error as Error).stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
