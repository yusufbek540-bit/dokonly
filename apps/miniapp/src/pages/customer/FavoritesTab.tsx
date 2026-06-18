import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/Icon'
import { api } from '@/lib/api'

interface FavoritesTabProps {
  tenantId: string
  currency: string
  products: any[]
  onProduct: (id: string) => void
  onShowCatalog: () => void
}

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

export function FavoritesTab({ tenantId, currency, products, onProduct, onShowCatalog }: FavoritesTabProps) {
  const { data: wishlistIds = [] } = useQuery<string[]>({
    queryKey: ['wishlist', tenantId],
    queryFn: () => api.getWishlist(tenantId),
  })

  const favorites = products.filter((p) => wishlistIds.includes(p.id) && p.is_active !== false)

  return (
    <div className="screen-scroll" style={{ minHeight: '100%', background: 'var(--bg)', padding: '18px 16px 104px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: 'Sora', fontSize: 24, fontWeight: 850, color: 'var(--ink)', letterSpacing: '-0.03em' }}>
          Избранное
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>
          Товары, которые покупатель сохранил для быстрого доступа.
        </div>
      </div>

      {favorites.length === 0 ? (
        <div style={{
          minHeight: 360,
          borderRadius: 24,
          border: '1px solid var(--border)',
          background: 'var(--card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 24,
        }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: 999,
            background: 'var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Icon name="star" size={26} color="var(--accent)" />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>
            Пока ничего нет
          </div>
          <div style={{ maxWidth: 250, fontSize: 13, lineHeight: 1.45, color: 'var(--muted)', marginBottom: 18 }}>
            Нажмите на сердечко в карточке товара, чтобы сохранить его здесь.
          </div>
          <button
            onClick={onShowCatalog}
            style={{
              height: 44,
              padding: '0 18px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: 'white',
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            Открыть каталог
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {favorites.map((p) => {
            const image = p.images?.[0]
            return (
              <button
                key={p.id}
                onClick={() => onProduct(p.id)}
                style={{
                  overflow: 'hidden',
                  borderRadius: 18,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  textAlign: 'left',
                  boxShadow: '0 10px 24px rgba(15,23,42,0.05)',
                }}
              >
                <div style={{ aspectRatio: '1 / 1.08', background: 'var(--subtle)', overflow: 'hidden' }}>
                  {image ? (
                    <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="image" size={28} color="var(--muted)" />
                    </div>
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ minHeight: 36, fontSize: 13, lineHeight: 1.35, fontWeight: 800, color: 'var(--ink)' }}>
                    {p.name}
                  </div>
                  <div style={{ marginTop: 7, fontSize: 13, fontWeight: 900, color: 'var(--ink)' }}>
                    {fmtPrice(Number(p.price), currency)}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
