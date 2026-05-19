import { useEffect } from 'react'
import { useSafeTop } from '@/hooks/useTelegram'
import { Icon } from '@/components/Icon'

interface FullPageProps {
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function FullPage({ onClose, title, children }: FullPageProps) {
  const safeTop = useSafeTop()

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      onTouchMove={e => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'var(--bg)', overflowY: 'auto', overscrollBehavior: 'contain',
        paddingTop: safeTop,
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
        animation: 'slideUpFull 0.25s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <style>{`@keyframes slideUpFull { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{
            width: 34, height: 34, borderRadius: 999,
            background: 'var(--subtle)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        {title && (
          <span style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
            {title}
          </span>
        )}
      </div>
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  )
}
