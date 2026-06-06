import Link from 'next/link'
import type { BlogPost, Locale } from '@/content/marketing/types'

interface BlogCardProps {
  post: BlogPost
  locale: Locale
}

const readingLabel = {
  ru: 'мин чтения',
  uz: 'daqiqalik o‘qish',
} as const

const readMoreLabel = {
  ru: 'Читать статью',
  uz: 'Maqolani o‘qish',
} as const

export function BlogCard({ post, locale }: BlogCardProps) {
  return (
    <Link href={post.slug[locale]} className="marketing-card group flex min-h-[260px] flex-col p-5 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-950/10">
      <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
        <span>{post.category[locale]}</span>
        <time dateTime={post.date}>{post.date}</time>
      </div>
      <h2 className="mt-4 text-xl font-black leading-tight text-gray-950">{post.title[locale]}</h2>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600">{post.description[locale]}</p>
      <div className="mt-auto flex items-center justify-between gap-4 pt-6 text-sm font-semibold">
        <span className="text-gray-500">
          {post.readingMinutes} {readingLabel[locale]}
        </span>
        <span className="text-emerald-700 group-hover:text-emerald-800">{readMoreLabel[locale]}</span>
      </div>
    </Link>
  )
}
