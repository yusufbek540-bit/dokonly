const DEFAULT_TEST_OWNER_ID = 'a414389d-a2c3-5c42-8486-095020e84b01'

function noop() {}

function getParam(name: string) {
  return new URLSearchParams(window.location.search).get(name)
}

export function installTelegramMock() {
  if (!import.meta.env.DEV || (window as any).Telegram?.WebApp) return

  const role = getParam('mock_role') ?? localStorage.getItem('dokonly_mock_role') ?? 'buyer'
  const userId = Number(getParam('mock_user_id') ?? localStorage.getItem('dokonly_mock_user_id') ?? (role === 'owner' ? 10001 : 20001))
  const firstName = getParam('mock_first_name') ?? (role === 'owner' ? 'Demo Seller' : 'Demo Buyer')
  const username = getParam('mock_username') ?? (role === 'owner' ? 'demo_seller' : 'demo_buyer')
  const mockOwnerId = getParam('mock_owner_id') ?? (role === 'owner' ? DEFAULT_TEST_OWNER_ID : '')

  localStorage.setItem('dokonly_mock_role', role)
  localStorage.setItem('dokonly_mock_user_id', String(userId))

  const user: Record<string, unknown> = {
    id: userId,
    first_name: firstName,
    username,
    language_code: 'ru',
  }

  if (mockOwnerId) {
    user._mock_owner_id = mockOwnerId
  }

  const listeners = new Map<string, Set<() => void>>()
  const onEvent = (event: string, fn: () => void) => {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)?.add(fn)
  }
  const offEvent = (event: string, fn: () => void) => {
    listeners.get(event)?.delete(fn)
  }

  const MainButton = {
    text: '',
    color: '#00B383',
    textColor: '#ffffff',
    isVisible: false,
    isActive: true,
    show() { this.isVisible = true },
    hide() { this.isVisible = false },
    enable() { this.isActive = true },
    disable() { this.isActive = false },
    setText(text: string) { this.text = text },
    onClick: noop,
    offClick: noop,
    setParams(params: { text?: string; color?: string; text_color?: string; is_active?: boolean; is_visible?: boolean }) {
      if (params.text !== undefined) this.text = params.text
      if (params.color !== undefined) this.color = params.color
      if (params.text_color !== undefined) this.textColor = params.text_color
      if (params.is_active !== undefined) this.isActive = params.is_active
      if (params.is_visible !== undefined) this.isVisible = params.is_visible
    },
  }

  const BackButton = {
    show: noop,
    hide: noop,
    onClick: noop,
    offClick: noop,
  }

  ;(window as any).Telegram = {
    WebApp: {
      initData: `mock:${encodeURIComponent(JSON.stringify(user))}`,
      initDataUnsafe: { user },
      colorScheme: 'light',
      viewportHeight: window.innerHeight,
      isFullscreen: false,
      safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      MainButton,
      BackButton,
      HapticFeedback: {
        impactOccurred: noop,
        notificationOccurred: noop,
        selectionChanged: noop,
      },
      ready: noop,
      expand: noop,
      close: noop,
      disableVerticalSwipes: noop,
      requestFullscreen: noop,
      onEvent,
      offEvent,
      openLink: (url: string) => window.open(url, '_blank', 'noopener,noreferrer'),
      openTelegramLink: (url: string) => window.open(url, '_blank', 'noopener,noreferrer'),
      switchInlineQuery: noop,
      shareToStory: noop,
      showConfirm: (_message: string, callback?: (confirmed: boolean) => void) => callback?.(window.confirm(_message)),
      requestContact: (callback?: (ok: boolean, contact?: unknown) => void) => {
        callback?.(true, {
          phone_number: '+998901234567',
          first_name: firstName,
          user_id: userId,
        })
      },
    },
  }

  document.documentElement.dataset.telegramMock = role
}
