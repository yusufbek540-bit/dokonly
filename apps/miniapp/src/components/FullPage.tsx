import { useEffect } from 'react'
import { useSafeTop } from '@/hooks/useTelegram'
import { Icon } from '@/components/Icon'

interface FullPageProps {
  onClose: () => void
  children: React.ReactNode
}

export function FullPage({ onClose, children }: FullPageProps) {
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
      }}
    >
      <style>{`@keyframes slideUpFull { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>
      <button
        onClick={onClose}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '14px 16px 10px',
          color: 'var(--accent)', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: 15, fontWeight: 600,
        }}
      >
        <Icon name="arrowLeft" size={20} color="var(--accent)" strokeWidth={2.5} />
        Назад
      </button>
      {children}
    </div>
  )
}
