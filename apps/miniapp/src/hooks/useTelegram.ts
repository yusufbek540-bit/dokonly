import { useEffect, useRef } from 'react'

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
    color: string
    textColor: string
    isVisible: boolean
    isActive: boolean
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    setText: (text: string) => void
    onClick: (fn: () => void) => void
    offClick: (fn: () => void) => void
    setParams: (params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) => void
  }
  BackButton: { show: () => void; hide: () => void; onClick: (fn: () => void) => void; offClick: (fn: () => void) => void }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  colorScheme: 'light' | 'dark'
  openLink: (url: string) => void
  switchInlineQuery: (query: string, types?: string[]) => void
  shareToStory: (media_url: string, params?: object) => void
}

export function useTelegram() {
  const tg = window.Telegram?.WebApp
  useEffect(() => {
    tg?.ready()
    tg?.expand()
  }, [tg])
  return { tg, user: tg?.initDataUnsafe?.user, initData: tg?.initData ?? '' }
}

interface MainButtonOptions {
  text: string
  onClick: () => void
  isVisible: boolean
  color?: string | null
  disabled?: boolean
}

export function useTelegramMainButton({ text, onClick, isVisible, color, disabled }: MainButtonOptions) {
  const tg = window.Telegram?.WebApp
  const callbackRef = useRef(onClick)
  callbackRef.current = onClick
  const disabledRef = useRef(disabled)
  disabledRef.current = disabled

  useEffect(() => {
    if (!tg) return
    const mb = tg.MainButton
    const handler = () => { if (!disabledRef.current) callbackRef.current() }
    mb.onClick(handler)
    return () => {
      mb.offClick(handler)
      mb.hide()
    }
  }, [])

  useEffect(() => {
    if (!tg) return
    const mb = tg.MainButton
    if (!isVisible) {
      mb.hide()
      return
    }
    mb.setText(text)
    mb.setParams({ color: color ?? undefined, is_active: !disabled })
    mb.show()
  }, [text, isVisible, color, disabled])
}
