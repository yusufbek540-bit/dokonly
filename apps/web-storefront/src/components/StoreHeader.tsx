'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useCart } from '@/store/cart'
import type { Shop } from '@/lib/api'
import { CartSheet } from './CartSheet'

interface StoreHeaderProps {
  shop: Shop
  slug: string
  onSearch?: (q: string) => void
  searchQuery?: string
}

export function StoreHeader({ shop, slug, onSearch, searchQuery = '' }: StoreHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const count = useCart((s) => s.count())
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 100)
    }
  }, [searchOpen])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) onSearch(localQuery)
    else {
      window.location.href = `/${slug}/search?q=${encodeURIComponent(localQuery)}`
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            {/* Logo + Name */}
            <Link href={`/${slug}`} className="flex items-center gap-2.5 shrink-0 group">
              {shop.logo_url ? (
                <img
                  src={shop.logo_url}
                  alt={shop.name}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: 'var(--accent)' }}
                >
                  {shop.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className="font-bold text-gray-900 text-lg hidden sm:block group-hover:opacity-80 transition-opacity"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {shop.name}
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6 ml-6 flex-1">
              <Link
                href={`/${slug}`}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Каталог
              </Link>
              <Link
                href={`/${slug}/search`}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Поиск
              </Link>
            </nav>

            {/* Search bar — desktop inline */}
            <div className="hidden md:flex flex-1 max-w-md">
              <form onSubmit={handleSearch} className="w-full relative">
                <input
                  type="text"
                  value={localQuery}
                  onChange={(e) => {
                    setLocalQuery(e.target.value)
                    if (onSearch) onSearch(e.target.value)
                  }}
                  placeholder="Поиск товаров..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>

            {/* Right icons */}
            <div className="flex items-center gap-1 ml-auto">
              {/* Mobile search toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Profile / orders link */}
              <Link
                href={`/${slug}/cart`}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
                title="Корзина"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>

              {/* Cart icon */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
                aria-label="Открыть корзину"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 11H4L5 9z" />
                </svg>
                {count > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 text-white text-xs font-bold rounded-full flex items-center justify-center"
                    style={{ background: 'var(--accent)' }}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>

              {/* Mobile menu */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              >
                {mobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile search bar */}
          {searchOpen && (
            <div className="md:hidden pb-3">
              <form onSubmit={handleSearch} className="relative">
                <input
                  ref={searchRef}
                  type="text"
                  value={localQuery}
                  onChange={(e) => {
                    setLocalQuery(e.target.value)
                    if (onSearch) onSearch(e.target.value)
                  }}
                  placeholder="Поиск товаров..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': 'var(--accent)' } as React.CSSProperties}
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>
          )}

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-3">
              <nav className="flex flex-col gap-1">
                <Link
                  href={`/${slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  Каталог
                </Link>
                <Link
                  href={`/${slug}/search`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  Поиск
                </Link>
                <Link
                  href={`/${slug}/cart`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg flex items-center gap-2"
                >
                  Корзина
                  {count > 0 && (
                    <span
                      className="text-white text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--accent)' }}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Cart slide-out sheet */}
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} slug={slug} currency={shop.currency} />
    </>
  )
}
