import { useMainButtonStore } from '@/store/mainButton'

export function MainButtonBar() {
  const { text, onClick, isVisible, color, disabled } = useMainButtonStore()

  if (!isVisible) return null

  return (
    <div style={{ padding: '8px 16px', flexShrink: 0, background: 'var(--bg)' }}>
      <button
        onClick={onClick ?? undefined}
        disabled={disabled}
        style={{
          width: '100%', height: 52, borderRadius: 14,
          background: color ?? 'var(--accent)',
          color: 'white', fontWeight: 700, fontSize: 15,
          border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'opacity 0.15s, background 0.2s',
        }}
      >
        {text}
      </button>
    </div>
  )
}
