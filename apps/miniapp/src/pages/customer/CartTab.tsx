import { useCart } from '@/store/cart'
import { Icon } from '@/components/Icon'

interface Props {
  currency: string
  onCheckout: () => void
  onShowCatalog: () => void
}

function fmtPrice(n: number, currency: string) {
  if (currency === 'UZS') return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' сум'
  return n.toLocaleString() + ' ' + currency
}

export function CartTab({ currency, onCheckout, onShowCatalog }: Props) {
  const items = useCart((s) => s.items)
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)
  const cartTotal = useCart((s) => s.total)()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
      }}>
        <div style={{ flex: 1, fontFamily: 'Sora', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
          Корзина
        </div>
        {items.length > 0 && (
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {items.reduce((s, i) => s + i.qty, 0)} шт.
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 32, textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 999,
            background: 'var(--subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <Icon name="cart" size={36} color="var(--muted)"/>
          </div>
          <h2 style={{ fontFamily: 'Sora', fontWeight: 700, fontSize: 20, color: 'var(--ink)', marginBottom: 8 }}>
            Корзина пуста
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 32, lineHeight: 1.6 }}>
            Добавьте товары из каталога, чтобы оформить заказ
          </p>
          <button
            onClick={onShowCatalog}
            style={{
              height: 50, padding: '0 32px', borderRadius: 14,
              background: 'var(--accent)', color: 'white',
              fontWeight: 700, fontSize: 15,
            }}
          >
            Перейти в каталог
          </button>
        </div>
      ) : (
        <>
          <div className="screen-scroll" style={{ flex: 1, paddingBottom: 100 }}>
            {/* Items */}
            <div style={{ padding: '12px 16px 0' }}>
              {items.map(item => (
                <div key={item.key} style={{
                  display: 'flex', gap: 12, padding: '12px 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt={item.name} style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 10, objectFit: 'cover' }}/>
                    : <div className="img-ph" data-tone={item.tone ?? 0} style={{ width: 72, height: 72, flexShrink: 0, borderRadius: 10, fontSize: 11 }}>
                        <span>{item.name.split(' ').slice(0, 2).join(' ')}</span>
                      </div>
                  }

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}>
                        {item.name}
                      </div>
                      <button
                        onClick={() => remove(item.key)}
                        style={{
                          flexShrink: 0, width: 28, height: 28, borderRadius: 999,
                          background: 'var(--subtle)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Icon name="x" size={12} color="var(--muted)"/>
                      </button>
                    </div>

                    {/* Size / color badges */}
                    {(item.size || item.color) && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        {item.size && (
                          <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--subtle)', padding: '2px 7px', borderRadius: 6 }}>
                            {item.size}
                          </span>
                        )}
                        {item.color && (
                          <span style={{ fontSize: 11, color: 'var(--muted)', background: item.color, padding: '2px 7px', borderRadius: 6, border: '1px solid var(--border)' }}>
                            {item.color}
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                        {fmtPrice(item.price * item.qty, currency)}
                      </span>

                      {/* Qty controls */}
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--subtle)', borderRadius: 8 }}>
                        <button
                          onClick={() => item.qty === 1 ? remove(item.key) : setQty(item.key, item.qty - 1)}
                          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Icon name={item.qty === 1 ? 'x' : 'minus'} size={14}/>
                        </button>
                        <span style={{ minWidth: 20, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>
                          {item.qty}
                        </span>
                        <button
                          onClick={() => setQty(item.key, item.qty + 1)}
                          style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Icon name="plus" size={14}/>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total summary */}
            <div style={{ margin: '20px 16px 0', padding: 16, borderRadius: 16, background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>
                  {items.reduce((s, i) => s + i.qty, 0)} товара
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: 16, color: 'var(--ink)' }}>
                  {fmtPrice(cartTotal, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Checkout button */}
          <div style={{
            position: 'sticky', bottom: 0,
            padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
            background: 'var(--bg)', borderTop: '1px solid var(--border)',
            zIndex: 30,
          }}>
            <button
              onClick={onCheckout}
              style={{
                width: '100%', height: 52, borderRadius: 14,
                background: 'var(--accent)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontWeight: 700, fontSize: 15,
              }}
            >
              Оформить заказ · {fmtPrice(cartTotal, currency)}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
