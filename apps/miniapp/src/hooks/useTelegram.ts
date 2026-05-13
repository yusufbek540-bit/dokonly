import { useEffect } from 'react'

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name: string; username?: string; language_code?: string }
  }
  MainButton: {
    text: string
    show: () => void
    hide: () => void
    onClick: (fn: () => void) => void
  }
  BackButton: { show: () => void; hide: () => void; onClick: (fn: () => void) => void }
  colorScheme: 'light' | 'dark'
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp
  useEffect(() => {
    tg?.ready()
    tg?.expand()
  }, [tg])
  return { tg, user: tg?.initDataUnsafe?.user, initData: tg?.initData ?? '' }
}
