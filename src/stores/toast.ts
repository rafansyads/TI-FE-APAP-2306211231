import { defineStore } from 'pinia'

export type ToastType = 'success' | 'error' | 'info' | 'warn'

export const useToastStore = defineStore('toast', {
  state: () => ({
    open: false,
    message: '' as string,
    type: 'info' as ToastType,
    duration: 2000 as number,
  }),
  actions: {
    show(message: string, type: ToastType = 'info', duration = 2000) {
      this.message = message
      this.type = type
      this.duration = duration
      this.open = true
    },
    showSuccess(message: string, duration = 2000) { this.show(message, 'success', duration) },
    showError(message: string, duration = 2000) { this.show(message, 'error', duration) },
    showInfo(message: string, duration = 2000) { this.show(message, 'info', duration) },
    showWarn(message: string, duration = 2000) { this.show(message, 'warn', duration) },
    close() { this.open = false }
  }
})
