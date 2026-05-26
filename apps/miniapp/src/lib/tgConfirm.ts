export function tgConfirm(message: string, onOk: () => void) {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.showConfirm) {
    tg.showConfirm(message, (ok: boolean) => { if (ok) onOk() })
  } else if (window.confirm(message)) {
    onOk()
  }
}
