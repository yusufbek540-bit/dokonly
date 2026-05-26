import { create } from 'zustand'

interface MainButtonState {
  text: string
  onClick: (() => void) | null
  isVisible: boolean
  color?: string | null
  disabled?: boolean
}

interface MainButtonStore extends MainButtonState {
  setMainButton: (opts: MainButtonState) => void
  hideMainButton: () => void
}

export const useMainButtonStore = create<MainButtonStore>((set) => ({
  text: '',
  onClick: null,
  isVisible: false,
  color: null,
  disabled: false,
  setMainButton: (opts) => set(opts),
  hideMainButton: () => set({ isVisible: false }),
}))
