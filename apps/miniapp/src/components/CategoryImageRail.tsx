import type { CSSProperties } from 'react'
import { Icon } from '@/components/Icon'

export interface CategoryImageRailItem {
  name: string
  imageUrl?: string | null
}

interface CategoryImageRailProps {
  items: CategoryImageRailItem[]
  selected?: string | null
  onSelect: (name?: string) => void
  allLabel?: string
  maxItems?: number
  style?: CSSProperties
}

function fallbackLabel(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '•'
}

export function CategoryImageRail({
  items,
  selected = null,
  onSelect,
  allLabel = 'Все',
  maxItems,
  style,
}: CategoryImageRailProps) {
  const visibleItems = maxItems ? items.slice(0, maxItems) : items
  if (visibleItems.length === 0) return null

  return (
    <section
      style={{
        margin: '0 16px',
        padding: '14px 12px 16px',
        borderRadius: 22,
        background: '#fff',
        border: '1px solid rgba(15,23,42,0.06)',
        boxShadow: '0 12px 30px rgba(15,23,42,0.05)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => onSelect(undefined)}
          aria-pressed={!selected}
          style={{
            height: 34,
            borderRadius: 999,
            padding: '0 11px 0 14px',
            background: selected ? 'rgba(15,23,42,0.04)' : 'var(--accent-soft)',
            color: 'var(--accent)',
            border: '1px solid rgba(15,23,42,0.04)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 14,
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          {allLabel}
          <Icon name="chevronRight" size={16} color="currentColor" strokeWidth={2.4} />
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          padding: '0 2px 2px',
        }}
      >
        {visibleItems.map((item) => {
          const isSelected = selected === item.name
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onSelect(item.name)}
              aria-pressed={isSelected}
              style={{
                width: 78,
                flex: '0 0 78px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                border: 0,
                padding: 0,
                color: 'var(--ink)',
              }}
            >
              <span
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 18,
                  overflow: 'hidden',
                  background: item.imageUrl ? '#f3f4f6' : 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(99,102,241,0.10))',
                  border: isSelected ? '2px solid var(--accent)' : '1px solid rgba(15,23,42,0.05)',
                  boxShadow: isSelected ? '0 8px 18px rgba(16,185,129,0.18)' : '0 8px 18px rgba(15,23,42,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border-color .18s ease, box-shadow .18s ease, transform .18s ease',
                  transform: isSelected ? 'translateY(-1px)' : 'none',
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <span style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)' }}>
                    {fallbackLabel(item.name)}
                  </span>
                )}
              </span>
              <span
                style={{
                  maxWidth: 86,
                  minHeight: 34,
                  color: '#111827',
                  fontSize: 13,
                  lineHeight: 1.18,
                  fontWeight: isSelected ? 850 : 650,
                  textAlign: 'center',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2,
                }}
              >
                {item.name}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
