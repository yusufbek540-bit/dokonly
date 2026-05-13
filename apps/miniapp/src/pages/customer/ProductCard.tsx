import { useCart } from '@/store/cart'

interface Props {
  id: string
  name: string
  price: number
  currency: string
  images: string[]
  description?: string
}

export function ProductCard({ id, name, price, currency, images, description }: Props) {
  const add = useCart((s) => s.add)
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {images[0] && (
        <img src={images[0]} alt={name} className="w-full h-44 object-cover" />
      )}
      <div className="p-3">
        <p className="font-semibold text-sm leading-snug">{name}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-accent">
            {price.toLocaleString()} {currency}
          </span>
          <button
            onClick={() => add({ productId: id, name, price })}
            className="bg-accent text-white text-sm px-3 py-1.5 rounded-xl"
          >
            + Купить
          </button>
        </div>
      </div>
    </div>
  )
}
