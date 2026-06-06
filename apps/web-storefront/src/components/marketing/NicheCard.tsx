import Link from 'next/link'
import type { Locale, Niche } from '@/content/marketing/types'

interface NicheCardProps {
  niche: Niche
  locale: Locale
}

const ariaLabel = {
  ru: 'Открыть страницу ниши',
  uz: 'Soha sahifasini ochish',
} as const

export function NicheCard({ niche, locale }: NicheCardProps) {
  return (
    <Link
      href={niche.slug[locale]}
      className="group flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/10"
      aria-label={`${ariaLabel[locale]}: ${niche.name[locale]}`}
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-emerald-50">
        <img
          src={niche.image}
          alt={niche.name[locale]}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>
      <div className="flex h-full flex-col p-5">
        <div className="mb-4 h-2 w-16 rounded-full bg-emerald-600" aria-hidden="true" />
        <h3 className="text-xl font-bold leading-tight text-gray-950">{niche.name[locale]}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{niche.description[locale]}</p>
        <ul className="mt-5 space-y-2 text-sm font-medium text-gray-800">
          {niche.benefits[locale].slice(0, 3).map((benefit) => (
            <li key={benefit} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
        <span className="mt-auto pt-5 text-sm font-semibold text-emerald-700 group-hover:text-emerald-800">
          {locale === 'ru' ? 'Подробнее' : 'Batafsil'}
        </span>
      </div>
    </Link>
  )
}
