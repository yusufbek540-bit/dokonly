'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { HelpArticle, Locale } from '@/content/marketing/types'

interface HelpSearchProps {
  articles: HelpArticle[]
  locale: Locale
}

const copy = {
  ru: {
    search: 'Поиск по помощи',
    empty: 'Ничего не найдено',
  },
  uz: {
    search: 'Yordam bo‘yicha qidirish',
    empty: 'Hech narsa topilmadi',
  },
}

export function HelpSearch({ articles, locale }: HelpSearchProps) {
  const [query, setQuery] = useState('')
  const localizedCopy = copy[locale]
  const normalizedQuery = query.trim().toLocaleLowerCase()

  const filteredArticles = useMemo(() => {
    if (!normalizedQuery) {
      return articles
    }

    return articles.filter((article) => {
      const title = article.title[locale].toLocaleLowerCase()
      const description = article.description[locale].toLocaleLowerCase()

      return title.includes(normalizedQuery) || description.includes(normalizedQuery)
    })
  }, [articles, locale, normalizedQuery])

  return (
    <div>
      <label htmlFor="help-search" className="text-sm font-bold text-gray-900">
        {localizedCopy.search}
      </label>
      <input
        id="help-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={localizedCopy.search}
        className="mt-3 min-h-12 w-full rounded-lg border border-gray-200 bg-white px-4 text-base text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />

      {filteredArticles.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {filteredArticles.map((article) => (
            <Link key={article.id} href={article.slug[locale]} className="marketing-card block p-5 transition hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/10">
              <h3 className="text-lg font-black leading-tight text-gray-950">{article.title[locale]}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">{article.description[locale]}</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-gray-600">{localizedCopy.empty}</p>
      )}
    </div>
  )
}
