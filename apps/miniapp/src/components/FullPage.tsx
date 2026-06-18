import { useEffect } from 'react'
import { Icon } from '@/components/Icon'

interface FullPageProps {
  onClose: () => void
  title?: string
  children: React.ReactNode
  bottomInset?: string
}

export function FullPage({ onClose, title, children, bottomInset = 'calc(88px + env(safe-area-inset-bottom))' }: FullPageProps) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'var(--bg)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideUpFull 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <style>{`@keyframes slideUpFull { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
      {/* Fixed header — flex child, never scrolls */}
      <div style={{
        flexShrink: 0,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
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
      {/* Scrollable content only */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        paddingBottom: bottomInset,
        boxSizing: 'border-box',
      }}>
        {children}
      </div>
    </div>
  )
}
