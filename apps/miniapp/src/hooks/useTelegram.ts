import { useEffect, useRef, useState } from 'react'
import { useMainButtonStore } from '@/store/mainButton'

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
  isVersionAtLeast?: (version: string) => boolean
  openLink: (url: string) => void
  switchInlineQuery: (query: string, types?: string[]) => void
  shareMessage?: (preparedMessageId: string) => void
  shareToStory: (media_url: string, params?: object) => void
}

function computeSafeTop(): number {
  const tg = (window as any).Telegram?.WebApp
  if (!tg) return 0
  const apiTop = (tg.safeAreaInset?.top ?? 0) + (tg.contentSafeAreaInset?.top ?? 0)
  if (apiTop > 0) return apiTop
  const diff = Math.round(window.screen.height - (tg.viewportHeight || window.innerHeight))
  if (diff > 20 && diff < 200) return diff
  return 0
}

export function useSafeTop(): number {
  const [safeTop, setSafeTop] = useState<number>(computeSafeTop)
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    const update = () => setSafeTop(computeSafeTop())
    setTimeout(update, 100)
    setTimeout(update, 500)
    if (!tg) return
    const events = ['viewportChanged', 'safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged']
    events.forEach(e => tg.onEvent?.(e, update))
    return () => events.forEach(e => tg.offEvent?.(e, update))
  }, [])
  return safeTop
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
  const setMainButton = useMainButtonStore((s) => s.setMainButton)
  const hideMainButton = useMainButtonStore((s) => s.hideMainButton)
  const callbackRef = useRef(onClick)
  callbackRef.current = onClick

  useEffect(() => {
    return () => hideMainButton()
  }, [])

  useEffect(() => {
    if (!isVisible) {
      hideMainButton()
      return
    }
    setMainButton({
      text,
      onClick: () => callbackRef.current(),
      isVisible,
      color,
      disabled,
    })
  }, [text, isVisible, color, disabled])
}
