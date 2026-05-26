const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function noop() {}

function createDevInitData(): string {
  const user = {
    id: Number(import.meta.env.VITE_DEV_TG_USER_ID ?? 777000),
    first_name: import.meta.env.VITE_DEV_TG_FIRST_NAME ?? 'Local',
    username: import.meta.env.VITE_DEV_TG_USERNAME ?? 'local_dev',
    language_code: 'ru',
  }

  return new URLSearchParams({
    query_id: 'dev',
    user: JSON.stringify(user),
    auth_date: String(Math.floor(Date.now() / 1000)),
    hash: 'dev',
  }).toString()
}

export function isLocalTelegramDevMockEnabled(): boolean {
  return (
    import.meta.env.DEV &&
    LOCAL_HOSTS.has(window.location.hostname) &&
    import.meta.env.VITE_DISABLE_TELEGRAM_DEV_MOCK !== '1'
  )
}

export function getTelegramInitData(): string {
  return window.Telegram?.WebApp?.initData ?? (isLocalTelegramDevMockEnabled() ? createDevInitData() : '')
}

export function installTelegramDevMock() {
  if (!isLocalTelegramDevMockEnabled()) return
  if (window.Telegram?.WebApp?.initData) return

  const initData = createDevInitData()
  const user = JSON.parse(new URLSearchParams(initData).get('user') ?? '{}')
  const mainButton = {
    text: '',
    color: '#00B383',
    textColor: '#ffffff',
    isVisible: false,
    isActive: true,
    show: noop,
    hide: noop,
    enable: noop,
    disable: noop,
    setText: noop,
    onClick: noop,
    offClick: noop,
    setParams: noop,
  }

  window.Telegram = {
    ...window.Telegram,
    WebApp: {
      ready: noop,
      expand: noop,
      close: noop,
      disableVerticalSwipes: noop,
      requestFullscreen: noop,
      initData,
      initDataUnsafe: { user },
      MainButton: mainButton,
      BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop },
      HapticFeedback: {
        impactOccurred: noop,
        notificationOccurred: noop,
        selectionChanged: noop,
      },
      colorScheme: 'light',
      viewportHeight: window.innerHeight,
      safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      isFullscreen: false,
      openLink: (url: string) => window.open(url, '_blank'),
      openTelegramLink: (url: string) => window.open(url, '_blank'),
      switchInlineQuery: noop,
      shareToStory: noop,
      onEvent: noop,
      offEvent: noop,
    } as any,
  }
}
